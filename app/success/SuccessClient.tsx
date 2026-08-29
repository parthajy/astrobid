"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { humanDate } from "@/lib/date";
import { money } from "@/lib/money";

interface Info {
  bid: {
    id: string;
    launch_date: string;
    product_name: string;
    category: string;
    amount: number;
    status: string;
  };
  isWinner: boolean;
  leadingAmount: number;
  locked: boolean;
  manageUrl: string | null;
}

export default function SuccessClient() {
  const params = useSearchParams();
  const bidId = params.get("bid");
  const [info, setInfo] = useState<Info | null>(null);
  const [tries, setTries] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bidId) {
      setError("No bid reference in the URL.");
      return;
    }
    let stop = false;
    async function poll() {
      try {
        const res = await fetch(`/api/bid/${bidId}`, { cache: "no-store" });
        const json = await res.json();
        if (stop) return;
        if (!res.ok) {
          setError(json.error || "Could not load your bid.");
          return;
        }
        setInfo(json);
        // keep polling briefly until the payment is confirmed (webhook lag)
        if (json.bid.status !== "paid" && tries < 8) {
          setTimeout(() => setTries((t) => t + 1), 1500);
        }
      } catch {
        if (!stop) setError("Network error.");
      }
    }
    poll();
    return () => {
      stop = true;
    };
  }, [bidId, tries]);

  if (error) {
    return (
      <Shell>
        <p className="text-rose-600">{error}</p>
        <Link href="/" className="btn-ghost mt-4">
          Back to calendar
        </Link>
      </Shell>
    );
  }

  if (!info) {
    return (
      <Shell>
        <p className="t-muted">Confirming your payment…</p>
      </Shell>
    );
  }

  const paid = info.bid.status === "paid";

  return (
    <Shell>
      <div className="text-5xl">{paid ? (info.isWinner ? "🏆" : "🚀") : "⏳"}</div>
      <h1 className="mt-3 text-2xl font-extrabold glow">
        {!paid
          ? "Payment processing…"
          : info.isWinner
            ? "You're leading the launch!"
            : "Bid placed"}
      </h1>

      <p className="mt-2 text-sm t-muted">
        <span className="font-semibold t-ink">{info.bid.product_name}</span> ·{" "}
        {info.bid.category}
        <br />
        {humanDate(info.bid.launch_date)} · your bid{" "}
        <span className="font-bold t-accent">{money(info.bid.amount)}</span>
      </p>

      {paid && !info.isWinner && (
        <p className="mt-3 rounded-lg border border-cosmos-border surface-alt px-3 py-2 text-xs t-muted">
          You&apos;ve been outbid — current leader is at {money(info.leadingAmount)}. Head back and
          raise your bid. (Bids are not refunded.)
        </p>
      )}

      {paid && info.isWinner && !info.locked && (
        <p className="mt-3 text-xs t-muted">
          You&apos;ll keep the spot as long as no one outbids you before bidding closes (24h before
          the day). Your launch-page link is on this page.
        </p>
      )}

      {info.manageUrl && (
        <Link href={info.manageUrl} className="btn-primary mt-5">
          Set up your launch page →
        </Link>
      )}

      <div className="mt-4 flex gap-2">
        <Link href="/" className="btn-ghost">
          Calendar
        </Link>
        <Link href={`/launch/${info.bid.launch_date}`} className="btn-ghost">
          View this day
        </Link>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto mt-10 max-w-md px-4 text-center">
      <div className="panel px-6 py-10">{children}</div>
    </div>
  );
}
