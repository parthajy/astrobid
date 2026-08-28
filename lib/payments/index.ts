import { appUrl } from "@/lib/config";
import type { CheckoutInput, CheckoutResult, PaymentMode } from "./types";
import { createDodoCheckout } from "./dodo";
import { createRazorpayCheckout } from "./razorpay";

export type { CheckoutInput, CheckoutResult, PaymentMode } from "./types";

/**
 * Which payment path is active. Explicit PAYMENTS_PROVIDER wins; otherwise we
 * auto-detect from whichever provider's keys are present; otherwise "mock".
 *
 *  - mock     : local instant-confirm, for development
 *  - pledge   : bid is recorded with NO payment taken (settle the winner later)
 *  - dodo     : Dodo Payments hosted checkout (merchant of record, USD-friendly)
 *  - razorpay : Razorpay Payment Link (India / INR)
 */
export function paymentMode(): PaymentMode {
  const explicit = (process.env.PAYMENTS_PROVIDER || "").toLowerCase().trim();
  if (["mock", "pledge", "dodo", "razorpay"].includes(explicit)) {
    return explicit as PaymentMode;
  }
  if (process.env.DODO_API_KEY && process.env.DODO_PRODUCT_ID) return "dodo";
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) return "razorpay";
  return "mock";
}

/** True when real money is actually collected at bid time. */
export function chargesUpfront(): boolean {
  return paymentMode() === "dodo" || paymentMode() === "razorpay";
}

export async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const mode = paymentMode();
  switch (mode) {
    case "dodo":
      return createDodoCheckout(input);
    case "razorpay":
      return createRazorpayCheckout(input);
    case "pledge":
      return {
        url: `${appUrl()}/api/settle?bid=${input.bidId}&mode=pledge`,
        provider: "pledge",
        paymentId: null,
      };
    default:
      return {
        url: `${appUrl()}/api/settle?bid=${input.bidId}&mode=mock`,
        provider: "mock",
        paymentId: null,
      };
  }
}
