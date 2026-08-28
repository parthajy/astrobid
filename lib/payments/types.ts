export type PaymentMode = "mock" | "pledge" | "dodo" | "razorpay";

export interface CheckoutInput {
  bidId: string;
  amount: number; // whole currency units
  email: string;
  name: string;
  launchDate: string;
  productName: string;
}

export interface CheckoutResult {
  url: string;
  provider: PaymentMode;
  paymentId: string | null;
}
