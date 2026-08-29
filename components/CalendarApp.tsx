"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DaySummary } from "@/lib/types";
import {
  MONTHS,
  WEEKDAYS,
  addMonths,
  biddingOpen,
  fromISO,
  hoursUntilClose,
  monthGrid,
  startOfMonth,
  toISO,
  todayISO,
  weekKey,
} from "@/lib/date";
import { getDayInsight } from "@/lib/insights";
import { getBrowserClient } from "@/lib/supabase/client";
import { moneyCompact as money } from "@/lib/money";
import type { PaymentMode } from "@/lib/payments/types";

interface Props {
  initialDays: Record<string, DaySummary>;
  startMonthIso: string;
  maxMonthIso: string;
  supabaseReady: boolean;
  paymentMode: PaymentMode;
}

const PAYMENT_BANNER: Partial<Record<PaymentMode, string>> = {
  mock: "demo payments",
  pledge: "pledge mode · no card charged yet",
};

// Tue / Wed / Thu are the strongest launch days; used only to break score ties.
const WEEKDAY_PRIORITY = [6, 3, 0, 1, 2, 4, 5]; // Sun..Sat

type DayState = "past" | "urgent" | "golden" | "open";

export default function CalendarApp({
  initialDays,
  startMonthIso,
  maxMonthIso,
  supabaseReady,
  paymentMode,
}: Props) {
  const router = useRouter();
  const [days, setDays] = useState<Record<string, DaySummary>>(initialDays);
  const [view, setView] = useState<Date>(() => startOfMonth(fromISO(startMonthIso)));
  const [hover, setHover] = useState<{ iso: string; x: number; y: number } | null>(null);

  const today = todayISO();
  const minMonth = startOfMonth(fromISO(startMonthIso));
  const maxMonth = startOfMonth(fromISO(maxMonthIso));

  // Realtime: keep the grid live as bids land.
  useEffect(() => {
    if (!supabaseReady) return;
    const sb = getBrowserClient();
    if (!sb) return;

    const patch = (iso: string, p: Partial<DaySummary>) =>
      setDays((prev) => {
        const cur =
          prev[iso] ??
          ({ date: iso, bid_amount: 0, product_name: null, category: null, bidders: 0, locked: false } as DaySummary);
        return { ...prev, [iso]: { ...cur, ...p } };
      });

    const ch = sb
      .channel("astrobid-grid")
      .on("postgres_changes", { event: "*", schema: "public", table: "launches" }, (payload: any) => {
        const row = payload.new ?? payload.old;
        if (!row?.date) return;
        patch(row.date, {
          bid_amount: row.bid_amount ?? 0,
          product_name: row.product_name ?? null,
          category: row.category ?? null,
          locked: Boolean(row.locked),
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "bids" }, (payload: any) => {
        const row = payload.new ?? payload.old;
        if (!row?.launch_date || row.status !== "paid") return;
        setDays((prev) => {
          const cur = prev[row.launch_date];
          const bidders = cur?.bidders ?? 0;
          return {
            ...prev,
            [row.launch_date]: {
              date: row.launch_date,
              bid_amount: Math.max(cur?.bid_amount ?? 0, row.amount ?? 0),
              product_name: cur?.product_name ?? null,
              category: cur?.category ?? null,
              bidders: payload.eventType === "INSERT" ? bidders + 1 : bidders,
              locked: cur?.locked ?? false,
            },
          };
        });
      })
      .subscribe();

    return () => {
      sb.removeChannel(ch);
    };
  }, [supabaseReady]);

  const grid = useMemo(() => monthGrid(view), [view]);

  // The 3 best-scoring biddable days in each visible week.
  const golden = useMemo(() => {
    const byWeek: Record<string, { iso: string; score: number; wd: number }[]> = {};
    for (const d of grid) {
      const iso = toISO(d);
      if (iso < today) continue;
      if (hoursUntilClose(iso) <= 24) continue; // urgent / closed days don't count
      (byWeek[weekKey(iso)] ||= []).push({
        iso,
        score: getDayInsight(iso).score,
        wd: d.getDay(),
      });
    }
    const set = new Set<string>();
    for (const wk of Object.keys(byWeek)) {
      byWeek[wk]
        .sort(
          (a, b) =>
            b.score - a.score ||
            WEEKDAY_PRIORITY[a.wd] - WEEKDAY_PRIORITY[b.wd] ||
            a.iso.localeCompare(b.iso),
        )
        .slice(0, 3)
        .forEach((r) => set.add(r.iso));
    }
    return set;
  }, [grid, today]);

  const stateOf = (iso: string): DayState => {
    if (iso < today) return "past";
    if (hoursUntilClose(iso) <= 24) return "urgent";
    if (golden.has(iso)) return "golden";
    return "open";
  };

  const canPrev = startOfMonth(view) > minMonth;
  const canNext = startOfMonth(view) < maxMonth;
  const step = (n: number) =>
    setView((v) => {
      const next = startOfMonth(addMonths(v, n));
      return next < minMonth ? minMonth : next > maxMonth ? maxMonth : next;
    });

  const openDay = (iso: string, s: DayState, hasProduct: boolean) => {
    if (s === "past") {
      if (hasProduct) router.push(`/launch/${iso}`);
      return;
    }
    router.push(`/day/${iso}`);
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden px-2 py-2 sm:px-5 sm:py-4">
      {/* Header */}
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 pb-2 sm:pb-3">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="AstroBid" className="h-7 w-7 sm:h-9 sm:w-9" />
          <span className="text-lg font-extrabold tracking-tight t-ink sm:text-2xl">AstroBid</span>
        </div>

        <div className="order-3 flex items-center gap-1 sm:order-2">
          <button
            aria-label="Previous month"
            onClick={() => step(-1)}
            disabled={!canPrev}
            className="btn-ghost h-8 w-8 !px-0 text-base disabled:opacity-30"
          >
            ‹
          </button>
          <h1 className="min-w-[9.5rem] text-center text-base font-bold t-ink sm:min-w-[12rem] sm:text-xl">
            {MONTHS[view.getMonth()]} {view.getFullYear()}
          </h1>
          <button
            aria-label="Next month"
            onClick={() => step(1)}
            disabled={!canNext}
            className="btn-ghost h-8 w-8 !px-0 text-base disabled:opacity-30"
          >
            ›
          </button>
          <button onClick={() => setView(minMonth)} className="btn-ghost ml-1 h-8 !py-0 !px-2.5 text-xs">
            Today
          </button>
        </div>

        <nav className="order-2 ml-auto flex items-center gap-3 text-xs sm:order-3 sm:text-sm">
          <Link href="/stats" className="t-muted hover:underline">
            Stats
          </Link>
          <Link href="/archive" className="t-muted hover:underline">
            Archive
          </Link>
        </nav>

        <p className="order-4 flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-tight t-muted sm:text-xs">
          <span>
            Highest bid <span className="t-ink">24h before the day</span> wins the launch spotlight.
            No refunds.
          </span>
          <span className="hidden items-center gap-3 sm:flex">
            <Legend swatch="bg-white border border-cosmos-border" label="open" />
            <Legend swatch="bg-[#fdf3e0] border border-[#f0cd8b]" label="best days" />
            <Legend swatch="bg-[#fff4e6] border border-[#f6c58a]" label="closing" />
            <Legend swatch="bg-[#f1f0f5]" label="past" />
          </span>
          {PAYMENT_BANNER[paymentMode] && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">
              {PAYMENT_BANNER[paymentMode]}
            </span>
          )}
        </p>
      </header>

      {/* Grid */}
      <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-1">
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="text-center text-[10px] font-semibold uppercase tracking-wider t-faint sm:text-xs"
            >
              <span className="sm:hidden">{w[0]}</span>
              <span className="hidden sm:inline">{w}</span>
            </div>
          ))}
        </div>

        <div className="grid min-h-0 grid-cols-7 grid-rows-6 gap-1 sm:gap-1.5">
          {grid.map((d) => {
            const iso = toISO(d);
            const inMonth = d.getMonth() === view.getMonth();
            const isToday = iso === today;
            const s = stateOf(iso);
            const summary = days[iso];
            const insight = getDayInsight(iso);
            const bid = summary?.bid_amount ?? 0;
            const hasProduct = Boolean(summary?.product_name);
            const clickable = inMonth && (s !== "past" || hasProduct);

            const bg =
              s === "past"
                ? "bg-[#f1f0f5] border border-transparent"
                : s === "urgent"
                  ? "bg-[#fff4e6] border border-[#f6c58a]"
                  : s === "golden"
                    ? "bg-[#fdf3e0] border border-[#f0cd8b]"
                    : "bg-white border border-cosmos-border";

            return (
              <button
                key={iso}
                disabled={!clickable}
                onClick={() => openDay(iso, s, hasProduct)}
                onMouseEnter={(e) => {
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setHover({ iso, x: r.left + r.width / 2, y: r.top });
                }}
                onMouseLeave={() => setHover((h) => (h?.iso === iso ? null : h))}
                className={[
                  "group relative flex min-h-0 flex-col overflow-hidden rounded-lg p-1 text-left transition sm:rounded-xl sm:p-2",
                  bg,
                  !inMonth ? "opacity-40" : "",
                  clickable ? "cursor-pointer hover:border-cosmos-violet hover:shadow-card" : "cursor-default",
                  isToday ? "ring-1 ring-cosmos-violet" : "",
                ].join(" ")}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={[
                      "text-xs font-bold leading-none sm:text-sm",
                      s === "past" ? "text-[#9a97a8]" : isToday ? "t-accent" : "t-ink",
                    ].join(" ")}
                  >
                    {d.getDate()}
                  </span>
                  {s === "golden" && <span className="text-[9px] sm:text-[10px]">✦</span>}
                  {s === "urgent" && <span className="text-[9px] sm:text-[10px]">⏳</span>}
                  {summary?.locked && s !== "past" && <span className="text-[9px]">🔒</span>}
                </div>

                {inMonth && s !== "past" && (
                  <div
                    className={[
                      "mt-0.5 truncate text-[9px] leading-none sm:text-[11px]",
                      s === "open" ? "text-[#e0a92e]" : "text-[#d97706]",
                    ].join(" ")}
                    aria-label={`${insight.score} of 5 launch stars`}
                  >
                    {"★".repeat(insight.score)}
                    <span className="text-[#d9d5e6]">{"★".repeat(5 - insight.score)}</span>
                  </div>
                )}

                <div className="mt-auto min-w-0">
                  {bid > 0 ? (
                    <>
                      <div className="truncate text-[11px] font-extrabold t-accent sm:text-sm">
                        {money(bid)}
                      </div>
                      {hasProduct && (
                        <div
                          className={[
                            "truncate text-[9px] leading-tight sm:text-[10px]",
                            s === "past" ? "text-[#8b8898]" : "t-muted",
                          ].join(" ")}
                        >
                          {summary!.product_name}
                        </div>
                      )}
                    </>
                  ) : s === "past" ? (
                    <span className="text-[9px] text-[#a5a2b2] sm:text-[10px]">no launch</span>
                  ) : (
                    <span className="text-[10px] t-faint group-hover:t-accent sm:text-[11px]">
                      open · bid
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {hover && <HoverCard iso={hover.iso} x={hover.x} y={hover.y} />}
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-3 w-3 rounded ${swatch}`} />
      {label}
    </span>
  );
}

function HoverCard({ iso, x, y }: { iso: string; x: number; y: number }) {
  const insight = getDayInsight(iso);
  const d = fromISO(iso);
  const open = biddingOpen(iso);
  const width = 272;
  const left = Math.max(
    12,
    Math.min(x - width / 2, (typeof window !== "undefined" ? window.innerWidth : 1000) - width - 12),
  );
  return (
    <div
      className="pointer-events-none fixed z-50 hidden w-[272px] -translate-y-full rounded-xl border border-cosmos-border bg-white p-3 shadow-card md:block"
      style={{ left, top: y - 8 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold t-muted">
          {WEEKDAYS[d.getDay()]} · {MONTHS[d.getMonth()]} {d.getDate()}
        </span>
        <span className="text-[11px] text-[#d97706]">
          {"★".repeat(insight.score)}
          <span className="text-[#d9d5e6]">{"★".repeat(5 - insight.score)}</span>
        </span>
      </div>
      <div className="mt-1 text-sm font-bold t-accent">{insight.headline}</div>
      <p className="mt-1 text-xs leading-snug t-muted">{insight.reason}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {insight.tags.map((t) => (
          <span key={t} className="chip !text-[10px]">
            {t}
          </span>
        ))}
      </div>
      <div className="mt-2 text-[11px] t-faint">
        {open ? "Click to bid for this day →" : "Bidding closed — spotlight locked"}
      </div>
    </div>
  );
}
