import type { CheckoutInput, CheckoutResult, PaymentMode } from "./types";
import { createDodoCheckout } from "./dodo";
import { createRazorpayCheckout } from "./razorpay";
import { createLemonCheckout } from "./lemonsqueezy";

export type { CheckoutInput, CheckoutResult, PaymentMode } from "./types";

/**
 * Which payment path is active. Explicit PAYMENTS_PROVIDER wins; otherwise we
 * auto-detect from whichever provider's keys are present; otherwise "pledge".
 *
 *  - mock         : local instant-confirm that records a fake payment (dev only)
 *  - pledge       : bid is recorded with NO payment taken (invoice the winner later)
 *  - dodo         : Dodo Payments hosted checkout (merchant of record, USD)
 *  - razorpay     : Razorpay Payment Link (India / INR)
 *  - lemonsqueezy : Lemon Squeezy hosted checkout (test or live by key)
 */
export function paymentMode(): PaymentMode {
  const explicit = (process.env.PAYMENTS_PROVIDER || "").toLowerCase().trim();
  if (["mock", "pledge", "dodo", "razorpay", "lemonsqueezy"].includes(explicit)) {
    return explicit as PaymentMode;
  }
  if (process.env.DODO_API_KEY && process.env.DODO_PRODUCT_ID) return "dodo";
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) return "razorpay";
  if (
    process.env.LEMONSQUEEZY_API_KEY &&
    process.env.LEMONSQUEEZY_STORE_ID &&
    process.env.LEMONSQUEEZY_VARIANT_ID
  ) {
    return "lemonsqueezy";
  }
  return "pledge";
}

/** True when real money is actually collected at bid time. */
export function chargesUpfront(): boolean {
  return ["dodo", "razorpay", "lemonsqueezy"].includes(paymentMode());
}

/** Show a "test mode — cards won't be charged" hint in the UI. */
export function paymentsTestMode(): boolean {
  return /^(1|true|yes)$/i.test(process.env.PAYMENTS_TEST_MODE || "");
}

export async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const mode = paymentMode();
  switch (mode) {
    case "dodo":
      return createDodoCheckout(input);
    case "razorpay":
      return createRazorpayCheckout(input);
    case "lemonsqueezy":
      return createLemonCheckout(input);
    case "mock":
      return { url: `/api/settle?bid=${input.bidId}&mode=mock`, provider: "mock", paymentId: null };
    case "pledge":
    default:
      return {
        url: `/api/settle?bid=${input.bidId}&mode=pledge`,
        provider: "pledge",
        paymentId: null,
      };
  }
}
