import { NextResponse } from "next/server";
import { getAdminClient, hasServiceRole } from "@/lib/supabase/server";
import { finalizeBidPaid } from "@/lib/finalize";
import { extractLemonBidId, verifyLemonSignature } from "@/lib/payments/lemonsqueezy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUCCESS = new Set(["order_created"]);
const FAIL = new Set(["order_refunded"]);

export async function POST(req: Request) {
  const raw = await req.text();

  const ok = await verifyLemonSignature(raw, req.headers.get("x-signature"));
  if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  if (!hasServiceRole) {
    return NextResponse.json({ error: "server not configured" }, { status: 503 });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  const name: string = event?.meta?.event_name || "";
  const bidId = extractLemonBidId(event);
  if (!bidId) return NextResponse.json({ ok: true, ignored: "no bid_id" });

  const status = event?.data?.attributes?.status; // "paid" | "refunded" | ...
  const paymentId = event?.data?.id ?? null;
  const admin = getAdminClient();

  if (SUCCESS.has(name) && (status === "paid" || status === undefined)) {
    const result = await finalizeBidPaid(admin, bidId, paymentId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ ok: true, isWinner: result.isWinner });
  }

  if (FAIL.has(name)) {
    await admin.from("bids").update({ status: "failed" }).eq("id", bidId).eq("status", "pending");
    return NextResponse.json({ ok: true, marked: "failed" });
  }

  return NextResponse.json({ ok: true, ignored: name });
}
