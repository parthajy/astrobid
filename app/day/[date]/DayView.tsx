"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { DayDetail } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import { getDayInsight, signGlyph } from "@/lib/insights";
import { addMonths, fromISO, MONTHS, toISO, todayISO, WEEKDAYS } from "@/lib/date";
import { getBrowserClient } from "@/lib/supabase/client";
import { money } from "@/lib/money";
import { BASE_MIN_BID } from "@/lib/config";
import type { PaymentMode } from "@/lib/payments/types";

interface Props {
  date: string;
  supabaseReady: boolean;
  paymentMode: PaymentMode;
  testMode: boolean;
  maxDateIso: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CTA_VERB: Record<PaymentMode, string> = {
  dodo: "Pay",
  razorpay: "Pay",
  lemonsqueezy: "Pay",
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
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
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

function Favicon({ url }: { url: string }) {
  const [bad, setBad] = useState(false);
  const dom = domainOf(url);
  if (!dom || bad) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg surface-alt text-sm">
        🚀
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${dom}&sz=64`}
      alt=""
      onError={() => setBad(true)}
      className="h-9 w-9 shrink-0 rounded-lg border border-cosmos-border bg-white object-contain p-1"
    />
  );
}

export default function DayView({
  date,
  supabaseReady,
  paymentMode,
  testMode,
  maxDateIso,
}: Props) {
  const d = fromISO(date);
  const insight = getDayInsight(date);
  const isPast = date < todayISO();

  const [detail, setDetail] = useState<DayDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const [email, setEmail] = useState("");
  const [productName, setProductName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [tagline, setTagline] = useState("");
  const [amount, setAmount] = useState<number | "">(BASE_MIN_BID);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  async function load() {
    const mine = ++seq.current;
    try {
      const res = await fetch(`/api/day/${date}`, { cache: "no-store" });
      const json = (await res.json()) as DayDetail;
      if (mine === seq.current) {
        setDetail(json);
        setAmount((p) => {
          const cur = typeof p === "number" ? p : json.minBid;
          return cur < json.minBid ? json.minBid : cur;
        });
      }
    } catch {
      if (mine === seq.current) setError("Couldn't reach the server. Check your connection.");
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

  const bump = (n: number) =>
    setAmount((p) => Math.max(minBid, (typeof p === "number" ? p : minBid) + n));

  function focusForm() {
    document.getElementById("bid")?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => nameRef.current?.focus(), 300);
  }

  function outbidRow(rowAmount: number) {
    setAmount(rowAmount + 1);
    focusForm();
  }

  async function submit() {
    setError(null);
    if (validation) {
      setError(validation);
      focusForm();
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

  const claimCard = (
    <section id="bid" className="panel p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-lg font-extrabold t-ink sm:text-xl">
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
          <div className="min-w-[4.5rem] text-center text-2xl font-extrabold t-accent">
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
        {leader ? ` · beat ${leader.product_name} at ${money(leader.amount)}` : " · no bids yet"}
      </div>

      <div className="mt-4 space-y-2">
        <input
          ref={nameRef}
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
          onChange={(e) => setAmount(e.target.value === "" ? "" : Math.floor(Number(e.target.value)))}
        />
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-600">
          {error}
        </p>
      )}

      <button className="btn-primary mt-3 w-full" onClick={submit} disabled={submitting}>
        {submitting
          ? "Redirecting…"
          : `${CTA_VERB[paymentMode]} ${money(Number.isFinite(amountNum) ? amountNum : minBid)} & claim #1`}
      </button>
      {validation && !error && (
        <p className="mt-1.5 text-[11px] t-faint">{validation}</p>
      )}
      <p className="mt-2 text-[11px] t-faint">
        {testMode && (
          <span className="mr-1 rounded bg-amber-100 px-1 py-0.5 font-medium text-amber-700">
            test mode — no real charge
          </span>
        )}
        {paymentMode === "pledge"
          ? "Your bid is recorded now; you're invoiced only if you're still #1 when bidding closes. Pledges are binding."
          : "Payment is required to place a bid. If you're outbid, the bid is not refunded."}
      </p>
    </section>
  );

  return (
    <main className="min-h-[100dvh] pb-28 lg:pb-10">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-3 py-4 sm:px-4">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="AstroBid" className="h-8 w-8" />
          <span className="text-xl font-extrabold tracking-tight t-ink">AstroBid</span>
        </Link>
        <Link href="/" className="text-sm t-muted hover:underline">
          ← Calendar
        </Link>
      </header>

      <div className="mx-auto max-w-6xl px-3 sm:px-4">
        {/* Cosmic strip */}
        <section className="pb-3">
          <div className="text-[11px] uppercase tracking-widest t-muted">
            {WEEKDAYS[d.getDay()]} · launch spotlight
          </div>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-xl font-extrabold t-ink sm:text-2xl">
              {MONTHS[d.getMonth()]} {d.getDate()}, {d.getFullYear()}
            </h1>
            <span className="text-[#d97706]">
              {"★".repeat(insight.score)}
              <span className="text-[#d9d5e6]">{"★".repeat(5 - insight.score)}</span>
            </span>
            <span className="text-sm font-semibold t-accent">
              {insight.moonEmoji} {insight.headline}
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-sm t-muted">{insight.reason}</p>
          <p className="mt-1 text-xs">
            <span className="t-accent">✷ </span>
            <span className="t-muted">{insight.signAdvice}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {insight.tags.map((t) => (
              <span key={t} className="chip !text-[10px]">
                {t}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs t-muted">
            {open ? (
              <>
                Bidding closes in{" "}
                <span className="font-bold t-ink">{detail ? fmtCountdown(closesMs) : "…"}</span> — the
                leader then wins the calendar spotlight and a launch page.
              </>
            ) : (
              <>Bidding is closed. The #1 bid holds the spotlight.</>
            )}
          </p>
        </section>

        {/* Split: leaderboard first on mobile, bid panel sticky-left on desktop */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-6">
          <div className="order-2 lg:order-1 lg:sticky lg:top-4">
            {open ? (
              claimCard
            ) : (
              <section className="panel p-5 text-sm t-muted">
                Bidding for this day is closed.{" "}
                {leader && (
                  <>
                    <span className="t-accent">{leader.product_name}</span> holds #1 at{" "}
                    {money(leader.amount)}.
                  </>
                )}
                <div className="mt-3">
                  <Link href={`/launch/${date}`} className="btn-ghost">
                    View the launch page
                  </Link>
                </div>
              </section>
            )}

            {otherDates.length > 0 && (
              <p className="mt-3 text-xs t-muted">
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
          </div>

          <div className="order-1 lg:order-2">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest t-muted">Leaderboard</h2>
              <span className="text-xs t-faint">
                {bids.length} paid bid{bids.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="space-y-2">
              {loading && <p className="text-sm t-faint">Loading…</p>}
              {!loading && bids.length === 0 && (
                <p className="rounded-xl border border-dashed border-cosmos-border p-5 text-sm t-faint">
                  No paid bids yet — {open ? "claim this day first." : "nobody claimed this day."}
                </p>
              )}
              {bids.map((b, i) => {
                const dom = domainOf(b.url || "");
                return (
                  <div
                    key={b.id}
                    className={[
                      "group flex items-center gap-3 rounded-xl border p-3",
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
                    <Favicon url={b.url || ""} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold t-ink">
                        {b.url ? (
                          <a href={b.url} target="_blank" rel="noreferrer noopener" className="hover:underline">
                            {b.product_name}
                          </a>
                        ) : (
                          b.product_name
                        )}
                        {b.tagline && <span className="font-normal t-muted"> — {b.tagline}</span>}
                      </div>
                      <div className="truncate text-[11px] t-faint">
                        {b.category} · {timeAgo(b.paid_at || b.created_at)}
                        {dom && ` · ${dom}`}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-extrabold t-accent">{money(b.amount)}</div>
                      {open && (
                        <button
                          type="button"
                          onClick={() => outbidRow(b.amount)}
                          className="text-[10px] t-faint hover:t-accent"
                        >
                          outbid ↑
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {leader && open && (
              <p className="mt-3 text-xs t-faint">
                Take #1 from <span className="t-accent">{leader.product_name}</span> for{" "}
                {money(leader.amount + 1)} or more.
              </p>
            )}
          </div>
        </div>

        <p className="mt-10 text-center text-xs t-faint">
          <Link href="/" className="hover:underline">
            ← Back to the calendar
          </Link>
        </p>
      </div>

      {/* Mobile sticky bid bar — bid stays reachable while scrolling the leaderboard */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-cosmos-border bg-white/95 px-3 py-2 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-2">
            <button
              type="button"
              aria-label="Lower bid"
              onClick={() => bump(-1)}
              className="btn-ghost h-9 w-9 !px-0 text-lg"
            >
              −
            </button>
            <div className="min-w-[3.5rem] text-center text-lg font-extrabold t-accent">
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
            <button
              type="button"
              onClick={() => (validation ? focusForm() : submit())}
              className="btn-primary flex-1"
            >
              {submitting ? "…" : `${CTA_VERB[paymentMode]} & claim #1`}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
