export type PaymentMode = "mock" | "pledge" | "dodo" | "razorpay" | "lemonsqueezy";

export interface CheckoutInput {
  bidId: string;
  amount: number; // whole currency units
  email: string;
  name: string;
  launchDate: string;
  productName: string;
  /** Absolute origin of the incoming request, e.g. https://astrobid.lol */
  origin?: string;
}

export interface CheckoutResult {
  url: string;
  provider: PaymentMode;
  paymentId: string | null;
}
