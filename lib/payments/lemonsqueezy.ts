import { appUrl } from "@/lib/config";
import { CURRENCY_MINOR } from "@/lib/money";
import type { CheckoutInput, CheckoutResult } from "./types";

/**
 * Lemon Squeezy — hosted checkout with an overridable price.
 * Docs: https://docs.lemonsqueezy.com/api/checkouts/create-checkout
 *
 * Test vs live is decided entirely by the API key + store you use, so you can
 * ship with a test-mode key today and swap in live keys later — no code change.
 *
 * Env:
 *   LEMONSQUEEZY_API_KEY        (test-mode or live)
 *   LEMONSQUEEZY_STORE_ID
 *   LEMONSQUEEZY_VARIANT_ID     (a variant with "pay what you want" enabled)
 *   LEMONSQUEEZY_WEBHOOK_SECRET
 */

const API = "https://api.lemonsqueezy.com/v1";

export async function createLemonCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const body = {
    data: {
      type: "checkouts",
      attributes: {
        custom_price: Math.round(input.amount * CURRENCY_MINOR), // cents; variant must be PWYW
        product_options: {
          name: `AstroBid — ${input.launchDate} launch spot`,
          description: `Bid for the ${input.launchDate} launch spotlight: ${input.productName}`,
          redirect_url: `${input.origin || appUrl()}/success?bid=${input.bidId}`,
          receipt_button_text: "Back to AstroBid",
          receipt_link_url: input.origin || appUrl(),
        },
        checkout_options: { dark: false, media: false },
        checkout_data: {
          email: input.email,
          name: input.name || input.email.split("@")[0],
          custom: { bid_id: input.bidId, launch_date: input.launchDate },
        },
      },
      relationships: {
        store: { data: { type: "stores", id: String(process.env.LEMONSQUEEZY_STORE_ID) } },
        variant: {
          data: { type: "variants", id: String(process.env.LEMONSQUEEZY_VARIANT_ID) },
        },
      },
    },
  };

  const res = await fetch(`${API}/checkouts`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Lemon Squeezy checkout failed (${res.status}): ${text.slice(0, 300)}`);

  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Lemon Squeezy returned non-JSON: ${text.slice(0, 200)}`);
  }

  const url = json?.data?.attributes?.url;
  if (!url) throw new Error(`Lemon Squeezy response missing checkout url: ${text.slice(0, 200)}`);

  return { url, provider: "lemonsqueezy", paymentId: json?.data?.id ?? null };
}

/** Lemon Squeezy webhook signature: HMAC-SHA256(rawBody, secret) as hex, header `X-Signature`. */
export async function verifyLemonSignature(
  rawBody: string,
  signature: string | null,
): Promise<boolean> {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return true; // not configured — accept (dev)
  if (!signature) return false;
  const crypto = await import("node:crypto");
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export function extractLemonBidId(event: any): string | null {
  return event?.meta?.custom_data?.bid_id ?? null;
}
