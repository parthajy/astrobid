import type { SupabaseClient } from "@supabase/supabase-js";
import type { Bid } from "./types";
import { biddingOpen } from "./date";

export interface FinalizeResult {
  ok: boolean;
  alreadyPaid?: boolean;
  isWinner?: boolean;
  winnerBidId?: string | null;
  error?: string;
}

/**
 * Mark a bid as paid and recompute the winning launch for its date.
 * Idempotent: safe to call from both the Dodo webhook and the success redirect.
 */
export async function finalizeBidPaid(
  admin: SupabaseClient,
  bidId: string,
  paymentId: string | null,
  opts: { recordPayment?: boolean } = {},
): Promise<FinalizeResult> {
  const recordPayment = opts.recordPayment ?? true;
  const { data: bid, error: bidErr } = await admin
    .from("bids")
    .select("*")
    .eq("id", bidId)
    .single<Bid>();

  if (bidErr || !bid) return { ok: false, error: bidErr?.message || "bid not found" };
  if (bid.status === "paid") {
    const { data: launch } = await admin
      .from("launches")
      .select("winner_bid_id")
      .eq("date", bid.launch_date)
      .maybeSingle();
    return {
      ok: true,
      alreadyPaid: true,
      winnerBidId: launch?.winner_bid_id ?? null,
      isWinner: launch?.winner_bid_id === bidId,
    };
  }

  const nowIso = new Date().toISOString();

  await admin
    .from("bids")
    .update({ status: "paid", paid_at: nowIso, dodo_payment_id: paymentId })
    .eq("id", bidId);

  // Upsert the bidder as a user (email is the natural key).
  const { data: user } = await admin
    .from("users")
    .upsert(
      { email: bid.bidder_email, name: bid.bidder_name },
      { onConflict: "email", ignoreDuplicates: false },
    )
    .select("id")
    .single();

  // Record the payment (skipped for "pledge" mode, where no money changed hands).
  if (recordPayment) {
    await admin.from("payments").insert({
      user_id: user?.id ?? null,
      bid_id: bidId,
      amount: bid.amount,
      dodo_transaction_id: paymentId,
      status: "succeeded",
    });
  }

  // Recompute the current top paid bid for this date.
  const { data: topBid } = await admin
    .from("bids")
    .select("*")
    .eq("launch_date", bid.launch_date)
    .eq("status", "paid")
    .order("amount", { ascending: false })
    .order("paid_at", { ascending: true })
    .limit(1)
    .maybeSingle<Bid>();

  const winner = topBid ?? { ...bid, status: "paid" as const };

  const { data: existing } = await admin
    .from("launches")
    .select("id, locked")
    .eq("date", bid.launch_date)
    .maybeSingle();

  if (!existing) {
    await admin.from("launches").insert({
      date: bid.launch_date,
      product_name: winner.product_name,
      url: winner.url,
      category: winner.category,
      tagline: winner.tagline,
      bid_amount: winner.amount,
      winner_bid_id: winner.id,
      winner_id: user?.id ?? null,
      claimed_at: nowIso,
      updated_at: nowIso,
    });
  } else if (!existing.locked) {
    await admin
      .from("launches")
      .update({
        product_name: winner.product_name,
        url: winner.url,
        category: winner.category,
        tagline: winner.tagline,
        bid_amount: winner.amount,
        winner_bid_id: winner.id,
        winner_id: winner.id === bid.id ? user?.id ?? null : undefined,
        claimed_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", existing.id);
  }

  return {
    ok: true,
    winnerBidId: winner.id,
    isWinner: winner.id === bidId,
  };
}

/** Lock every launch whose bidding window (48h out) has closed. */
export async function lockClosedLaunches(admin: SupabaseClient): Promise<number> {
  const { data: rows } = await admin
    .from("launches")
    .select("id, date, locked")
    .eq("locked", false);
  if (!rows?.length) return 0;
  const toLock = rows.filter((r) => !biddingOpen(r.date));
  if (!toLock.length) return 0;
  await admin
    .from("launches")
    .update({ locked: true })
    .in(
      "id",
      toLock.map((r) => r.id),
    );
  return toLock.length;
}
