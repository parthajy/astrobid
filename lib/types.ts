export type BidStatus = "pending" | "paid" | "failed" | "refunded";

export interface Bid {
  id: string;
  launch_date: string; // YYYY-MM-DD
  product_name: string;
  url: string;
  category: string;
  tagline: string | null;
  bidder_name: string | null;
  bidder_email: string;
  amount: number; // whole US dollars
  status: BidStatus;
  dodo_payment_id: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface Launch {
  id: string;
  date: string; // YYYY-MM-DD
  product_name: string | null;
  url: string | null;
  category: string | null;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  bid_amount: number;
  winner_bid_id: string | null;
  winner_id: string | null;
  edit_token: string;
  locked: boolean;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Compact per-day payload the calendar grid renders. */
export interface DaySummary {
  date: string;
  bid_amount: number;
  product_name: string | null;
  category: string | null;
  bidders: number;
  locked: boolean;
}

export interface DayDetail {
  date: string;
  launch: Launch | null;
  bids: Bid[]; // paid bids, highest first
  minBid: number;
  biddingOpen: boolean;
  closesAt: string; // ISO
}
