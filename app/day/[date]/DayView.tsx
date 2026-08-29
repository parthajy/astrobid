"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { DayDetail } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { getDayInsight } from "@/lib/insights";
import { addMonths, fromISO, humanDate, MONTHS, toISO, todayISO, WEEKDAYS } from "@/lib/date";
import { getBrowserClient } from "@/lib/supabase/client";
import { money } from "@/lib/money";
import type { PaymentMode } from "@/lib/payments/types";

interface Props {
  date: string;
  supabaseReady: boolean;
  paymentMode: PaymentMode;
  maxDateIso: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CTA_VERB: Record<PaymentMode, string> = {
  dodo: "Pay",
  razorpay: "Pay",
  mock: "Confirm",
  pledge: "Pledge",
};

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

function timeAgo(iso: string | null): string {
  if (!iso) return "just now";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function shortHuman(iso: string): string {
  const d = fromISO(iso);
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

export default function DayView({ date, supabaseReady, paymentMode, maxDateIso }: Props) {
  const d = fromISO(date);
  const insight = getDayInsight(date);
  const isPast = date < todayISO();

  const [detail, setDetail] = useState<DayDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [productName, setProductName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [tagline, setTagline] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seq = useRef(0);
  async function load() {
    const mine = ++seq.current;
    try {
      const res = await fetch(`/api/day/${date}`, { cache: "no-store" });
      const json = (await res.json()) as DayDetail;
      if (mine === seq.current) {
        setDetail(json);
        setAmount((p) => (p === "" ? json.minBid : p));
      }
    } catch {
      if (mine === seq.current) setError("Could not load this day.");
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!supabaseReady) return;
    const sb = getBrowserClient();
    if (!sb) return;
    const ch = sb
      .channel(`astrobid-day-${date}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bids", filter: `launch_date=eq.${date}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "launches", filter: `date=eq.${date}` },
        () => load(),
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, supabaseReady]);

  const minBid = detail?.minBid ?? 5;
  const closesMs = detail ? new Date(detail.closesAt).getTime() - now : 0;
  const open = detail ? detail.biddingOpen && closesMs > 0 : !isPast;
  const bids = detail?.bids ?? [];
  const leader = bids[0] ?? null;
  const amountNum = typeof amount === "number" ? amount : NaN;

  const otherDates = useMemo(() => {
    const out: string[] = [];
    const today = todayISO();
    for (let k = 1; k <= 6; k++) {
      const c = addMonths(d, k);
      c.setDate(d.getDate());
      const iso = toISO(c);
      if (iso >= today && iso <= maxDateIso) out.push(iso);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, maxDateIso]);

  const validation = (() => {
    if (!EMAIL_RE.test(email)) return "Enter a valid email — your launch-page link goes there.";
    if (productName.trim().length < 2) return "Product name is required.";
    if (url && !/^https?:\/\/.+\..+/.test(url.trim())) return "URL must start with http:// or https://";
    if (!CATEGORIES.includes(category)) return "Pick a category.";
    if (!Number.isInteger(amountNum)) return "Bid must be a whole number.";
    if (amountNum < minBid) return `Bid must be at least ${money(minBid)}.`;
    return null;
  })();

  async function submit() {
    setError(null);
    if (validation) return setError(validation);
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
      window.location.href = json.checkoutUrl;
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  const bump = (n: number) =>
    setAmount((p) => Math.max(minBid, (typeof p === "number" ? p : minBid) + n));

  return (
    <main className="min-h-[100dvh] pb-24">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="AstroBid" className="h-8 w-8" />
          <span className="text-xl font-extrabold tracking-tight t-ink">AstroBid</span>
        </Link>
        <Link href="/" className="text-sm t-muted hover:underline">
          ← Calendar
        </Link>
      </header>

      <div className="mx-auto max-w-3xl px-4">
        {/* Date + insight */}
        <div className="text-xs uppercase tracking-widest t-muted">
          {WEEKDAYS[d.getDay()]} · launch spotlight
        </div>
        <h1 className="mt-0.5 text-2xl font-extrabold t-ink sm:text-3xl">
          {MONTHS[d.getMonth()]} {d.getDate()}, {d.getFullYear()}
        </h1>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[#d97706]">
            {"★".repeat(insight.score)}
            <span className="text-[#d9d5e6]">{"★".repeat(5 - insight.score)}</span>
          </span>
          <span className="text-sm font-semibold t-accent">{insight.headline}</span>
        </div>
        <p className="mt-1 max-w-xl text-sm t-muted">
          {insight.reason} <span className="t-faint">— that&apos;s the alignment we score every day on.</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {insight.tags.map((t) => (
            <span key={t} className="chip !text-[10px]">
              {t}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm t-muted">
          {open ? (
            <>
              Bidding closes in{" "}
              <span className="font-bold t-ink">{detail ? fmtCountdown(closesMs) : "…"}</span> · the
              leader then wins the calendar spotlight and a launch page.
            </>
          ) : (
            <>Bidding is closed. The #1 bid holds the spotlight.</>
          )}
        </p>

        {/* Claim card */}
        {open && (
          <section className="panel mt-6 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xl font-extrabold t-ink sm:text-2xl">
                Claim <span className="t-accent">#1</span> for
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Lower bid"
                  onClick={() => bump(-1)}
                  className="btn-ghost h-9 w-9 !px-0 text-lg"
                >
                  −
                </button>
                <div className="min-w-[5rem] text-center text-2xl font-extrabold t-accent sm:text-3xl">
                  {money(Number.isFinite(amountNum) ? amountNum : minBid)}
                </div>
                <button
                  type="button"
                  aria-label="Raise bid"
                  onClick={() => bump(1)}
                  className="btn-ghost h-9 w-9 !px-0 text-lg"
                >
                  +
                </button>
              </div>
            </div>
            <div className="mt-1 text-xs t-faint">
              Minimum {money(minBid)}
              {leader ? ` · beat ${leader.product_name} (${money(leader.amount)})` : " · no bids yet"}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <input
                className="field"
                placeholder="Product name *"
                value={productName}
                maxLength={80}
                onChange={(e) => setProductName(e.target.value)}
              />
              <input
                className="field"
                placeholder="https://your-product.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                className="field"
                type="email"
                inputMode="email"
                placeholder="you@startup.com *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input
                className="field"
                placeholder="Tagline (shown on your launch page)"
                value={tagline}
                maxLength={120}
                onChange={(e) => setTagline(e.target.value)}
              />
              <input
                className="field"
                type="number"
                min={minBid}
                step={1}
                placeholder={`Bid amount (min ${minBid})`}
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value === "" ? "" : Math.floor(Number(e.target.value)))
                }
              />
            </div>

            {error && (
              <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                {error}
              </p>
            )}

            <button
              className="btn-primary mt-3 w-full sm:w-auto"
              onClick={submit}
              disabled={submitting || Boolean(validation)}
            >
              {submitting
                ? "Redirecting…"
                : `${CTA_VERB[paymentMode]} ${money(
                    Number.isFinite(amountNum) ? amountNum : minBid,
                  )} & claim #1`}
            </button>
            <p className="mt-2 text-[11px] t-faint">
              {paymentMode === "pledge"
                ? "Your bid is recorded now; you're invoiced only if you're still #1 when bidding closes. Pledges are binding."
                : "Payment is required to place a bid. If you're outbid, the bid is not refunded."}
            </p>
          </section>
        )}

        {otherDates.length > 0 && (
          <p className="mt-4 text-xs t-muted">
            Book ahead:{" "}
            {otherDates.map((o, i) => (
              <span key={o}>
                {i > 0 && " · "}
                <Link href={`/day/${o}`} className="t-accent hover:underline">
                  {shortHuman(o)}
                </Link>
              </span>
            ))}
          </p>
        )}

        {/* Leaderboard */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest t-muted">Leaderboard</h2>
            <span className="text-xs t-faint">{bids.length} paid bid{bids.length === 1 ? "" : "s"}</span>
          </div>

          <div className="mt-3 space-y-2">
            {loading && <p className="text-sm t-faint">Loading…</p>}
            {!loading && bids.length === 0 && (
              <p className="rounded-xl border border-dashed border-cosmos-border p-4 text-sm t-faint">
                No paid bids yet — {open ? "claim this day first." : "nobody claimed this day."}
              </p>
            )}
            {bids.map((b, i) => {
              const dom = domainOf(b.url || "");
              return (
                <div
                  key={b.id}
                  className={[
                    "flex items-center gap-3 rounded-xl border p-3",
                    i === 0 ? "border-cosmos-violet bg-[#f4efff]" : "border-cosmos-border bg-white",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      i === 0 ? "bg-cosmos-violet text-white" : "surface-alt t-muted",
                    ].join(" ")}
                  >
                    {i + 1}
                  </span>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg surface-alt text-sm">
                    🚀
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold t-ink">
                      {b.url ? (
                        <a
                          href={b.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="hover:underline"
                        >
                          {b.product_name}
                        </a>
                      ) : (
                        b.product_name
                      )}
                      {b.tagline && <span className="font-normal t-muted"> · {b.tagline}</span>}
                    </div>
                    <div className="truncate text-[11px] t-faint">
                      {b.category} · {timeAgo(b.paid_at || b.created_at)}
                      {dom && ` · ${dom}`}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-extrabold t-accent">{money(b.amount)}</span>
                </div>
              );
            })}
          </div>

          {leader && (
            <p className="mt-3 text-xs t-faint">
              Current #1: <span className="t-accent">{leader.product_name}</span> at{" "}
              {money(leader.amount)}.{" "}
              {open && <>Outbid it from {money(minBid)}.</>}
            </p>
          )}
        </section>

        <p className="mt-10 text-center text-xs t-faint">
          <Link href="/" className="hover:underline">
            ← Back to the calendar
          </Link>
        </p>
      </div>
    </main>
  );
}
