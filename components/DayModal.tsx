"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DayDetail, DaySummary } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { getDayInsight } from "@/lib/insights";
import {
  addMonths,
  fromISO,
  humanDate,
  MONTHS,
  toISO,
  todayISO,
  WEEKDAYS,
} from "@/lib/date";
import { getBrowserClient } from "@/lib/supabase/client";
import { money } from "@/lib/money";
import type { PaymentMode } from "@/lib/payments/types";

interface Props {
  date: string;
  maxMonthIso: string;
  supabaseReady: boolean;
  paymentMode: PaymentMode;
  onClose: () => void;
  onLocalUpdate: (iso: string, patch: Partial<DaySummary>) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CTA_VERB: Record<PaymentMode, string> = {
  dodo: "Pay",
  razorpay: "Pay",
  mock: "Simulate paying",
  pledge: "Pledge",
};

function buildDateOptions(clicked: string, maxIso: string): string[] {
  const base = fromISO(clicked);
  const today = todayISO();
  const out: string[] = [];
  for (let k = 0; k < 12; k++) {
    const cand = addMonths(base, k);
    // keep the same day-of-month where possible
    cand.setDate(base.getDate());
    const iso = toISO(cand);
    if (iso >= today && iso <= maxIso && !out.includes(iso)) out.push(iso);
  }
  if (!out.includes(clicked) && clicked >= today) out.unshift(clicked);
  return out;
}

function fmtCountdown(ms: number): string {
  if (ms <= 0) return "closed";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

export default function DayModal({
  date: clickedDate,
  maxMonthIso,
  supabaseReady,
  paymentMode,
  onClose,
  onLocalUpdate,
}: Props) {
  const dateOptions = useMemo(
    () => buildDateOptions(clickedDate, maxMonthIso),
    [clickedDate, maxMonthIso],
  );
  const [date, setDate] = useState<string>(dateOptions[0] || clickedDate);
  const [detail, setDetail] = useState<DayDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [productName, setProductName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [tagline, setTagline] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const insight = getDayInsight(date);

  // lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // esc to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // countdown tick
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadSeq = useRef(0);
  async function load(d: string) {
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      const res = await fetch(`/api/day/${d}`, { cache: "no-store" });
      const json = (await res.json()) as DayDetail;
      if (seq === loadSeq.current) {
        setDetail(json);
        setAmount((prev) => (prev === "" ? json.minBid : prev));
      }
    } catch {
      if (seq === loadSeq.current) setError("Could not load this day.");
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }

  useEffect(() => {
    setAmount("");
    load(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // realtime for this date
  useEffect(() => {
    if (!supabaseReady) return;
    const sb = getBrowserClient();
    if (!sb) return;
    const ch = sb
      .channel(`astrobid-day-${date}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bids", filter: `launch_date=eq.${date}` },
        () => load(date),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "launches", filter: `date=eq.${date}` },
        () => load(date),
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, supabaseReady]);

  const minBid = detail?.minBid ?? 5;
  const closesMs = detail ? new Date(detail.closesAt).getTime() - now : 0;
  const open = detail ? detail.biddingOpen && closesMs > 0 : true;
  const leader = detail?.bids?.[0] ?? null;
  const amountNum = typeof amount === "number" ? amount : NaN;

  const validation = (() => {
    if (!EMAIL_RE.test(email)) return "Enter a valid email — we send your launch page link there.";
    if (productName.trim().length < 2) return "Product name is required.";
    if (url && !/^https?:\/\/.+\..+/.test(url.trim()))
      return "URL must start with http:// or https://";
    if (!CATEGORIES.includes(category)) return "Pick a category.";
    if (!Number.isFinite(amountNum) || !Number.isInteger(amountNum))
      return "Bid must be a whole number.";
    if (amountNum < minBid) return `Bid must be at least ${money(minBid)}.`;
    return null;
  })();

  async function submit() {
    setError(null);
    if (validation) {
      setError(validation);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          email: email.trim(),
          name: name.trim(),
          productName: productName.trim(),
          url: url.trim(),
          category,
          tagline: tagline.trim(),
          amount: amountNum,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Something went wrong.");
        setSubmitting(false);
        return;
      }
      onLocalUpdate(date, { bid_amount: Math.max(minBid, amountNum) });
      window.location.href = json.checkoutUrl;
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  const d = fromISO(date);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="panel relative max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-b-none rounded-t-2xl sm:rounded-2xl">
        {/* header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-cosmos-border bg-cosmos-panel/95 px-4 py-3 backdrop-blur">
          <div>
            <div className="text-xs uppercase tracking-widest text-violet-200/50">
              {WEEKDAYS[d.getDay()]} · launch spotlight
            </div>
            <div className="text-lg font-extrabold glow-soft">
              {MONTHS[d.getMonth()]} {d.getDate()}, {d.getFullYear()}
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost h-8 w-8 !px-0 text-lg" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="grid gap-0 sm:grid-cols-[1.1fr_1fr]">
          {/* form */}
          <div className="space-y-3 border-b border-cosmos-border p-4 sm:border-b-0 sm:border-r">
            {dateOptions.length > 1 && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-violet-200/70">
                  Launch date (book ahead)
                </span>
                <select
                  className="field"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                >
                  {dateOptions.map((o) => (
                    <option key={o} value={o}>
                      {humanDate(o)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-violet-200/70">Email *</span>
                <input
                  className="field"
                  type="email"
                  inputMode="email"
                  placeholder="you@startup.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-violet-200/70">Your name</span>
                <input
                  className="field"
                  placeholder="optional"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-violet-200/70">Product name *</span>
              <input
                className="field"
                placeholder="AstroBid"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                maxLength={80}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-violet-200/70">URL</span>
              <input
                className="field"
                placeholder="https://…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-violet-200/70">Category *</span>
                <select
                  className="field"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-violet-200/70">
                  Bid *{" "}
                  <span className="text-violet-300/60">min {money(minBid)}</span>
                </span>
                <input
                  className="field"
                  type="number"
                  min={minBid}
                  step={1}
                  placeholder={`${minBid}`}
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value === "" ? "" : Math.floor(Number(e.target.value)))
                  }
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-violet-200/70">
                Tagline <span className="text-violet-300/50">(shown on your launch page)</span>
              </span>
              <input
                className="field"
                placeholder="One line about what you're shipping"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                maxLength={120}
              />
            </label>

            {error && (
              <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </p>
            )}

            <button
              className="btn-primary w-full"
              onClick={submit}
              disabled={submitting || !open || Boolean(validation)}
            >
              {submitting
                ? "Redirecting…"
                : !open
                  ? "Bidding closed"
                  : `${CTA_VERB[paymentMode]} ${money(
                      Number.isFinite(amountNum) ? amountNum : minBid,
                    )}${paymentMode === "dodo" ? " via Dodo" : paymentMode === "razorpay" ? " via Razorpay" : ""}`}
            </button>
            <p className="text-center text-[11px] text-violet-200/40">
              {paymentMode === "pledge"
                ? "Placing a bid records your pledge — you'll be invoiced only if you win. Pledges are binding."
                : "Payment is required to place a bid. If you're outbid, the bid is not refunded."}
            </p>
          </div>

          {/* preview + leaderboard */}
          <div className="space-y-4 p-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-violet-200/50">
                  Why this day
                </span>
                <span className="text-sm text-cosmos-star">{"⭐".repeat(insight.score)}</span>
              </div>
              <div className="mt-1 text-sm font-bold text-violet-200 glow-soft">
                {insight.headline}
              </div>
              <p className="mt-1 text-xs leading-snug text-white/55">{insight.reason}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {insight.tags.map((t) => (
                  <span key={t} className="chip !text-[10px]">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-cosmos-border bg-black/30 p-3">
              <div className="mb-1 flex items-center justify-between text-xs text-violet-200/60">
                <span>
                  Closes{" "}
                  <span className="font-semibold text-violet-200">
                    {detail ? fmtCountdown(closesMs) : "…"}
                  </span>
                </span>
                <span>48h before launch</span>
              </div>
              <div className="text-[11px] text-white/40">
                Whoever leads when bidding closes gets the launch page.
              </div>
            </div>

            {/* live preview card */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-violet-200/50">
                Your preview
              </span>
              <div className="mt-2 rounded-xl border border-cosmos-border bg-cosmos-card/70 p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/40 to-indigo-500/30 text-sm">
                    🚀
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-white">
                      {productName || "Your product"}
                    </div>
                    <div className="truncate text-[11px] text-white/45">
                      {tagline || "Your tagline appears here"}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="chip !text-[10px]">{category}</span>
                  <span className="text-xs font-extrabold text-violet-200 glow-soft">
                    {money(Number.isFinite(amountNum) ? amountNum : minBid)}
                  </span>
                </div>
              </div>
            </div>

            {/* leaderboard */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-violet-200/50">
                Leaderboard
              </span>
              <div className="mt-2 space-y-1.5">
                {loading && <div className="text-xs text-white/30">Loading…</div>}
                {!loading && (detail?.bids?.length ?? 0) === 0 && (
                  <div className="text-xs text-white/30">
                    No paid bids yet — be the first to claim this day.
                  </div>
                )}
                {detail?.bids?.slice(0, 8).map((b, i) => (
                  <div
                    key={b.id}
                    className={[
                      "flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs",
                      i === 0
                        ? "border-violet-400/50 bg-violet-500/10"
                        : "border-cosmos-border bg-black/20",
                    ].join(" ")}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="w-4 text-center text-white/40">{i + 1}</span>
                      <span className="truncate font-semibold text-white/90">{b.product_name}</span>
                      <span className="hidden truncate text-white/35 sm:inline">{b.category}</span>
                    </span>
                    <span className="font-extrabold text-violet-200">{money(b.amount)}</span>
                  </div>
                ))}
              </div>
              {leader && (
                <p className="mt-2 text-[11px] text-white/40">
                  Current leader: <span className="text-violet-200">{leader.product_name}</span> at{" "}
                  {money(leader.amount)}. Beat it with {money(minBid)}+.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
