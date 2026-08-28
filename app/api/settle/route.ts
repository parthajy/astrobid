import { NextResponse } from "next/server";
import { getAdminClient, hasServiceRole } from "@/lib/supabase/server";
import { finalizeBidPaid } from "@/lib/finalize";
import { appUrl } from "@/lib/config";
import { paymentMode } from "@/lib/payments";

export const dynamic = "force-dynamic";

/**
 * Internal settle endpoint for the non-gateway payment modes:
 *   ?mode=mock   → dev instant-confirm (records a payment row)
 *   ?mode=pledge → confirm the bid with NO payment recorded
 * Only reachable when the active PAYMENTS_PROVIDER actually is mock/pledge.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bidId = searchParams.get("bid");
  const mode = searchParams.get("mode") === "pledge" ? "pledge" : "mock";

  if (paymentMode() !== mode) {
    return NextResponse.json(
      { error: `settle mode "${mode}" is not the active payment provider` },
      { status: 400 },
    );
  }
  if (!hasServiceRole) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  if (!bidId) return NextResponse.json({ error: "missing bid" }, { status: 400 });

  const result = await finalizeBidPaid(getAdminClient(), bidId, `${mode}_${Date.now()}`, {
    recordPayment: mode === "mock",
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.redirect(`${appUrl()}/success?bid=${bidId}&${mode}=1`, { status: 302 });
}
