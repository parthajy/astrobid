import { NextResponse } from "next/server";
import { getAdminClient, hasServiceRole } from "@/lib/supabase/server";
import { getDayDetail } from "@/lib/data";
import { isValidCategory } from "@/lib/categories";
import { addDays, biddingOpen, todayISO, toISO } from "@/lib/date";
import { createCheckout } from "@/lib/payments";
import { BOOKING_HORIZON_DAYS, originFromRequest } from "@/lib/config";
import { money } from "@/lib/money";

export const dynamic = "force-dynamic";

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  if (!hasServiceRole) {
    return NextResponse.json(
      { error: "Server not configured. Add Supabase service-role env vars." },
      { status: 503 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const date = String(body.date || "");
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim().slice(0, 80) || null;
  const productName = String(body.productName || "").trim().slice(0, 80);
  const url = String(body.url || "").trim().slice(0, 300);
  const category = String(body.category || "");
  const tagline = String(body.tagline || "").trim().slice(0, 140) || null;
  const amount = Number(body.amount);

  // --- validation ---
  if (!ISO_RE.test(date)) return NextResponse.json({ error: "bad date" }, { status: 400 });
  const horizon = toISO(addDays(new Date(), BOOKING_HORIZON_DAYS));
  if (date < todayISO() || date > horizon)
    return NextResponse.json({ error: "date outside booking window" }, { status: 400 });
  if (!biddingOpen(date))
    return NextResponse.json({ error: "bidding closed for this day" }, { status: 409 });
  if (!EMAIL_RE.test(email))
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  if (productName.length < 2)
    return NextResponse.json({ error: "product name required" }, { status: 400 });
  if (url && !/^https?:\/\/.+\..+/.test(url))
    return NextResponse.json({ error: "url must start with http(s)://" }, { status: 400 });
  if (!isValidCategory(category))
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  if (!Number.isInteger(amount) || amount <= 0)
    return NextResponse.json({ error: "bid must be a positive whole number" }, { status: 400 });

  const detail = await getDayDetail(date);
  if (amount < detail.minBid)
    return NextResponse.json(
      { error: `bid must be at least ${money(detail.minBid)}`, minBid: detail.minBid },
      { status: 409 },
    );

  const admin = getAdminClient();
  const { data: bid, error } = await admin
    .from("bids")
    .insert({
      launch_date: date,
      product_name: productName,
      url: url || "",
      category,
      tagline,
      bidder_name: name,
      bidder_email: email,
      amount,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !bid) {
    return NextResponse.json({ error: error?.message || "could not create bid" }, { status: 500 });
  }

  try {
    const checkout = await createCheckout({
      bidId: bid.id,
      amount,
      email,
      name: name || "",
      launchDate: date,
      productName,
      origin: originFromRequest(req),
    });
    return NextResponse.json({
      bidId: bid.id,
      checkoutUrl: checkout.url,
      provider: checkout.provider,
    });
  } catch (e: any) {
    // roll the pending bid back so it never blocks the leaderboard
    await admin.from("bids").update({ status: "failed" }).eq("id", bid.id);
    return NextResponse.json(
      { error: `payment setup failed: ${e?.message || "unknown"}` },
      { status: 502 },
    );
  }
}
