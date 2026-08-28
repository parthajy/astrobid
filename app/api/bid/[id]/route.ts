import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Used by /success to show a bidder the outcome of their bid. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = getServerClient();
  if (!db) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const { data: bid } = await db
    .from("bids")
    .select("id, launch_date, product_name, category, amount, status")
    .eq("id", params.id)
    .maybeSingle();

  if (!bid) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: launch } = await db
    .from("launches")
    .select("winner_bid_id, bid_amount, edit_token, locked")
    .eq("date", bid.launch_date)
    .maybeSingle();

  const isWinner = launch?.winner_bid_id === bid.id;

  return NextResponse.json({
    bid,
    isWinner,
    leadingAmount: launch?.bid_amount ?? bid.amount,
    locked: Boolean(launch?.locked),
    // token only handed back to the current winner
    manageUrl: isWinner
      ? `/launch/${bid.launch_date}/edit?token=${launch?.edit_token}`
      : null,
  });
}
