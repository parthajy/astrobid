import { appUrl } from "@/lib/config";
import { CURRENCY, CURRENCY_MINOR } from "@/lib/money";
import type { CheckoutInput, CheckoutResult } from "./types";

/**
 * Dodo Payments — one-time "payment link" checkout with a dynamic amount.
 * The product referenced by DODO_PRODUCT_ID must be "Pay what you want".
 * Docs: https://docs.dodopayments.com/api-reference/payments/post-payments
 */

const MODE = (process.env.DODO_MODE || "test").toLowerCase();
const API_BASE =
  process.env.DODO_API_URL ||
  (MODE === "live" ? "https://live.dodopayments.com" : "https://test.dodopayments.com");

export async function createDodoCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const body = {
    payment_link: true,
    billing_currency: process.env.DODO_CURRENCY || CURRENCY,
    billing: {
      country: process.env.DODO_DEFAULT_COUNTRY || "US",
      state: "NA",
      city: "NA",
      street: "NA",
      zipcode: "00000",
    },
    customer: { email: input.email, name: input.name || input.email.split("@")[0] },
    product_cart: [
      {
        product_id: process.env.DODO_PRODUCT_ID,
        quantity: 1,
        amount: Math.round(input.amount * CURRENCY_MINOR),
      },
    ],
    return_url: `${input.origin || appUrl()}/success?bid=${input.bidId}`,
    metadata: {
      bid_id: input.bidId,
      launch_date: input.launchDate,
      product_name: input.productName,
    },
  };

  const res = await fetch(`${API_BASE}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DODO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Dodo checkout failed (${res.status}): ${text}`);

  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Dodo returned non-JSON: ${text.slice(0, 200)}`);
  }

  const url = json.payment_link || json.checkout_url || json.url;
  if (!url) throw new Error(`Dodo response missing payment_link: ${text.slice(0, 200)}`);

  return { url, provider: "dodo", paymentId: json.payment_id || json.id || null };
}

/**
 * Verify a Standard Webhooks signature (the scheme Dodo uses).
 * Signed content: `${id}.${timestamp}.${rawBody}` with the secret base64-decoded.
 */
export async function verifyDodoSignature(
  rawBody: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
): Promise<boolean> {
  const secret = process.env.DODO_WEBHOOK_SECRET;
  if (!secret) return true; // not configured — accept (dev)
  if (!headers.id || !headers.timestamp || !headers.signature) return false;

  const crypto = await import("node:crypto");
  const key = secret.startsWith("whsec_")
    ? Buffer.from(secret.slice(6), "base64")
    : Buffer.from(secret, "base64");

  const expected = crypto
    .createHmac("sha256", key)
    .update(`${headers.id}.${headers.timestamp}.${rawBody}`)
    .digest("base64");

  return headers.signature
    .split(" ")
    .map((p) => p.split(",")[1])
    .filter(Boolean)
    .some((sig) => {
      try {
        return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
      } catch {
        return false;
      }
    });
}
