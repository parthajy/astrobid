import { NextResponse } from "next/server";
import { getAdminClient, hasServiceRole } from "@/lib/supabase/server";
import { finalizeBidPaid } from "@/lib/finalize";
import { verifyDodoSignature } from "@/lib/payments/dodo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUCCESS_TYPES = new Set([
  "payment.succeeded",
  "payment.completed",
  "payment.captured",
  "checkout.session.completed",
]);
const FAIL_TYPES = new Set(["payment.failed", "payment.cancelled", "payment.canceled"]);

export async function POST(req: Request) {
  const raw = await req.text();

  const ok = await verifyDodoSignature(raw, {
    id: req.headers.get("webhook-id"),
    timestamp: req.headers.get("webhook-timestamp"),
    signature: req.headers.get("webhook-signature"),
  });
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

  const type: string = event.type || event.event_type || "";
  const data = event.data || event.payload || event;
  const metadata = data.metadata || data.object?.metadata || {};
  const bidId: string | undefined = metadata.bid_id;
  const paymentId: string | null =
    data.payment_id || data.id || data.object?.id || event.id || null;

  if (!bidId) return NextResponse.json({ ok: true, ignored: "no bid_id" });

  const admin = getAdminClient();

  if (SUCCESS_TYPES.has(type)) {
    const result = await finalizeBidPaid(admin, bidId, paymentId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ ok: true, isWinner: result.isWinner });
  }

  if (FAIL_TYPES.has(type)) {
    await admin.from("bids").update({ status: "failed" }).eq("id", bidId).eq("status", "pending");
    return NextResponse.json({ ok: true, marked: "failed" });
  }

  return NextResponse.json({ ok: true, ignored: type });
}
