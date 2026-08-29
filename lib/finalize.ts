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

  const { error: bidUpdErr } = await admin
    .from("bids")
    .update({ status: "paid", paid_at: nowIso, dodo_payment_id: paymentId })
    .eq("id", bidId);
  if (bidUpdErr) console.error("finalize: mark bid paid failed", bidUpdErr);

  // Upsert the bidder as a user (email is the natural key).
  const { data: user, error: userErr } = await admin
    .from("users")
    .upsert(
      { email: bid.bidder_email, name: bid.bidder_name },
      { onConflict: "email", ignoreDuplicates: false },
    )
    .select("id")
    .single();
  if (userErr) console.error("finalize: upsert user failed", userErr);

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
  const winnerIsThisBid = winner.id === bid.id;

  const { data: existing, error: existingErr } = await admin
    .from("launches")
    .select("id, locked, winner_id")
    .eq("date", bid.launch_date)
    .maybeSingle();
  if (existingErr) console.error("finalize: read launch failed", existingErr);

  const snapshot = {
    product_name: winner.product_name,
    url: winner.url,
    category: winner.category,
    tagline: winner.tagline,
    bid_amount: winner.amount,
    winner_bid_id: winner.id,
    claimed_at: nowIso,
    updated_at: nowIso,
  };

  if (!existing) {
    const { error } = await admin
      .from("launches")
      .insert({ date: bid.launch_date, ...snapshot, winner_id: user?.id ?? null });
    if (error) console.error("finalize: insert launch failed", error);
  } else if (!existing.locked) {
    const { error } = await admin
      .from("launches")
      .update({
        ...snapshot,
        winner_id: winnerIsThisBid ? user?.id ?? null : existing.winner_id ?? null,
      })
      .eq("id", existing.id);
    if (error) console.error("finalize: update launch failed", error);
  }

  return {
    ok: true,
    winnerBidId: winner.id,
    isWinner: winner.id === bidId,
  };
}

/** Lock every launch whose bidding window (24h out) has closed. */
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
