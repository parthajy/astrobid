import { NextResponse } from "next/server";
import { getAdminClient, hasServiceRole } from "@/lib/supabase/server";
import { finalizeBidPaid } from "@/lib/finalize";
import { extractRazorpayBidId, verifyRazorpaySignature } from "@/lib/payments/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUCCESS_EVENTS = new Set(["payment_link.paid", "payment.captured", "order.paid"]);
const FAIL_EVENTS = new Set(["payment_link.cancelled", "payment.failed"]);

export async function POST(req: Request) {
  const raw = await req.text();

  const ok = await verifyRazorpaySignature(raw, req.headers.get("x-razorpay-signature"));
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

  const name: string = event.event || "";
  const bidId = extractRazorpayBidId(event);
  if (!bidId) return NextResponse.json({ ok: true, ignored: "no bid_id" });

  const paymentId =
    event?.payload?.payment?.entity?.id ||
    event?.payload?.payment_link?.entity?.id ||
    null;

  const admin = getAdminClient();

  if (SUCCESS_EVENTS.has(name)) {
    const result = await finalizeBidPaid(admin, bidId, paymentId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ ok: true, isWinner: result.isWinner });
  }

  if (FAIL_EVENTS.has(name)) {
    await admin.from("bids").update({ status: "failed" }).eq("id", bidId).eq("status", "pending");
    return NextResponse.json({ ok: true, marked: "failed" });
  }

  return NextResponse.json({ ok: true, ignored: name });
}
