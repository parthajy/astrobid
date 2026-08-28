import { getServerClient } from "./supabase/server";
import { BASE_MIN_BID, MIN_INCREMENT } from "./config";
import { biddingOpen, closesAt, fromISO, todayISO } from "./date";
import type { Bid, DayDetail, DaySummary, Launch } from "./types";

export function minBidFor(currentTop: number): number {
  return Math.max(BASE_MIN_BID, (currentTop || 0) + MIN_INCREMENT);
}

/** Per-day summaries for the calendar grid, keyed by ISO date. */
export async function getDaySummaries(
  startIso: string,
  endIso: string,
): Promise<Record<string, DaySummary>> {
  const db = getServerClient();
  if (!db) return {};

  const [{ data: launches }, { data: bids }] = await Promise.all([
    db
      .from("launches")
      .select("date, bid_amount, product_name, category, locked")
      .gte("date", startIso)
      .lte("date", endIso),
    db
      .from("bids")
      .select("launch_date")
      .eq("status", "paid")
      .gte("launch_date", startIso)
      .lte("launch_date", endIso),
  ]);

  const counts: Record<string, number> = {};
  for (const b of bids ?? []) {
    counts[b.launch_date] = (counts[b.launch_date] || 0) + 1;
  }

  const out: Record<string, DaySummary> = {};
  for (const l of (launches ?? []) as any[]) {
    out[l.date] = {
      date: l.date,
      bid_amount: l.bid_amount ?? 0,
      product_name: l.product_name ?? null,
      category: l.category ?? null,
      bidders: counts[l.date] || 0,
      locked: Boolean(l.locked),
    };
  }
  // days that have bids but no launch row yet
  for (const [date, n] of Object.entries(counts)) {
    if (!out[date]) {
      out[date] = { date, bid_amount: 0, product_name: null, category: null, bidders: n, locked: false };
    }
  }
  return out;
}

export async function getDayDetail(date: string): Promise<DayDetail> {
  const db = getServerClient();
  const open = biddingOpen(date);
  const empty: DayDetail = {
    date,
    launch: null,
    bids: [],
    minBid: BASE_MIN_BID,
    biddingOpen: open,
    closesAt: closesAt(date).toISOString(),
  };
  if (!db) return empty;

  const [{ data: launch }, { data: bids }] = await Promise.all([
    db.from("launches").select("*").eq("date", date).maybeSingle<Launch>(),
    db
      .from("bids")
      .select("*")
      .eq("launch_date", date)
      .eq("status", "paid")
      .order("amount", { ascending: false })
      .order("paid_at", { ascending: true }),
  ]);

  const list = (bids ?? []) as Bid[];
  return {
    date,
    launch: launch ?? null,
    bids: list,
    minBid: minBidFor(list[0]?.amount ?? launch?.bid_amount ?? 0),
    biddingOpen: open,
    closesAt: closesAt(date).toISOString(),
  };
}

export interface StatsPayload {
  totalRevenue: number;
  totalBids: number;
  paidBids: number;
  activeDays: number;
  topDays: { date: string; amount: number; product_name: string | null; category: string | null }[];
  biddersByMonth: { month: string; bidders: number; revenue: number }[];
  configured: boolean;
}

export async function getStats(): Promise<StatsPayload> {
  const db = getServerClient();
  if (!db) {
    return {
      totalRevenue: 0,
      totalBids: 0,
      paidBids: 0,
      activeDays: 0,
      topDays: [],
      biddersByMonth: [],
      configured: false,
    };
  }

  const [{ data: payments }, { count: totalBids }, { data: paid }, { data: topLaunches }] =
    await Promise.all([
      db.from("payments").select("amount, created_at, status"),
      db.from("bids").select("*", { count: "exact", head: true }),
      db.from("bids").select("launch_date, amount, created_at").eq("status", "paid"),
      db
        .from("launches")
        .select("date, bid_amount, product_name, category")
        .order("bid_amount", { ascending: false })
        .limit(10),
    ]);

  const succeeded = (payments ?? []).filter((p: any) => p.status === "succeeded");
  const totalRevenue = succeeded.reduce((s: number, p: any) => s + (p.amount || 0), 0);

  const byMonth: Record<string, { bidders: number; revenue: number }> = {};
  for (const b of paid ?? []) {
    const m = (b as any).launch_date.slice(0, 7);
    byMonth[m] = byMonth[m] || { bidders: 0, revenue: 0 };
    byMonth[m].bidders += 1;
    byMonth[m].revenue += (b as any).amount || 0;
  }

  return {
    totalRevenue,
    totalBids: totalBids ?? 0,
    paidBids: (paid ?? []).length,
    activeDays: new Set((paid ?? []).map((b: any) => b.launch_date)).size,
    topDays: (topLaunches ?? [])
      .filter((l: any) => (l.bid_amount ?? 0) > 0)
      .map((l: any) => ({
        date: l.date,
        amount: l.bid_amount,
        product_name: l.product_name,
        category: l.category,
      })),
    biddersByMonth: Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v })),
    configured: true,
  };
}

export interface ArchiveRow {
  date: string;
  product_name: string | null;
  url: string | null;
  category: string | null;
  tagline: string | null;
  bid_amount: number;
  bidders: number;
}

export async function getArchive(): Promise<{ rows: ArchiveRow[]; configured: boolean }> {
  const db = getServerClient();
  if (!db) return { rows: [], configured: false };

  const today = todayISO();
  const [{ data: launches }, { data: bids }] = await Promise.all([
    db
      .from("launches")
      .select("date, product_name, url, category, tagline, bid_amount")
      .lt("date", today)
      .order("date", { ascending: false }),
    db.from("bids").select("launch_date").eq("status", "paid").lt("launch_date", today),
  ]);

  const counts: Record<string, number> = {};
  for (const b of bids ?? []) counts[(b as any).launch_date] = (counts[(b as any).launch_date] || 0) + 1;

  return {
    configured: true,
    rows: (launches ?? [])
      .filter((l: any) => l.product_name)
      .map((l: any) => ({
        date: l.date,
        product_name: l.product_name,
        url: l.url,
        category: l.category,
        tagline: l.tagline,
        bid_amount: l.bid_amount ?? 0,
        bidders: counts[l.date] || 0,
      })),
  };
}

export function sortDatesAsc(a: string, b: string): number {
  return fromISO(a).getTime() - fromISO(b).getTime();
}
