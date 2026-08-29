import { appUrl } from "@/lib/config";
import { CURRENCY, CURRENCY_MINOR } from "@/lib/money";
import type { CheckoutInput, CheckoutResult } from "./types";

/**
 * Razorpay Payment Links — dynamic amount, hosted page, no card fields on our side.
 * Docs: https://razorpay.com/docs/api/payments/payment-links/
 *
 * Env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
 * Default currency is INR; override with NEXT_PUBLIC_CURRENCY (needs international
 * payments enabled on the Razorpay account for non-INR).
 */

export async function createRazorpayCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const keyId = process.env.RAZORPAY_KEY_ID as string;
  const keySecret = process.env.RAZORPAY_KEY_SECRET as string;
  const currency = process.env.RAZORPAY_CURRENCY || CURRENCY || "INR";

  const body = {
    amount: Math.round(input.amount * CURRENCY_MINOR),
    currency,
    accept_partial: false,
    description: `AstroBid — ${input.launchDate} launch bid: ${input.productName}`.slice(0, 200),
    customer: {
      email: input.email,
      name: input.name || input.email.split("@")[0],
    },
    notify: { email: true, sms: false },
    reminder_enable: false,
    callback_url: `${input.origin || appUrl()}/success?bid=${input.bidId}`,
    callback_method: "get",
    notes: {
      bid_id: input.bidId,
      launch_date: input.launchDate,
    },
  };

  const res = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Razorpay payment link failed (${res.status}): ${text}`);

  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Razorpay returned non-JSON: ${text.slice(0, 200)}`);
  }

  if (!json.short_url) throw new Error(`Razorpay response missing short_url: ${text.slice(0, 200)}`);
  return { url: json.short_url, provider: "razorpay", paymentId: json.id || null };
}

/** Razorpay webhook signature: HMAC-SHA256(rawBody, webhook_secret) as hex. */
export async function verifyRazorpaySignature(
  rawBody: string,
  signature: string | null,
): Promise<boolean> {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return true; // not configured — accept (dev)
  if (!signature) return false;
  const crypto = await import("node:crypto");
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** Pull our bid id out of whichever entity the webhook carries. */
export function extractRazorpayBidId(event: any): string | null {
  const p = event?.payload || {};
  return (
    p?.payment_link?.entity?.notes?.bid_id ||
    p?.payment?.entity?.notes?.bid_id ||
    p?.order?.entity?.notes?.bid_id ||
    null
  );
}
