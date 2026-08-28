"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { DaySummary } from "@/lib/types";
import {
  MONTHS,
  WEEKDAYS,
  addMonths,
  fromISO,
  monthGrid,
  startOfMonth,
  toISO,
  todayISO,
} from "@/lib/date";
import { getDayInsight } from "@/lib/insights";
import { getBrowserClient } from "@/lib/supabase/client";
import { moneyCompact as money } from "@/lib/money";
import type { PaymentMode } from "@/lib/payments/types";
import DayModal from "@/components/DayModal";

interface Props {
  initialDays: Record<string, DaySummary>;
  startMonthIso: string;
  maxMonthIso: string;
  supabaseReady: boolean;
  paymentMode: PaymentMode;
}

const PAYMENT_BANNER: Partial<Record<PaymentMode, string>> = {
  mock: "demo payments",
  pledge: "pledge mode · no payment taken yet",
};

export default function CalendarApp({
  initialDays,
  startMonthIso,
  maxMonthIso,
  supabaseReady,
  paymentMode,
}: Props) {
  const [days, setDays] = useState<Record<string, DaySummary>>(initialDays);
  const [view, setView] = useState<Date>(() => startOfMonth(fromISO(startMonthIso)));
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<{ iso: string; x: number; y: number } | null>(null);

  const today = todayISO();
  const minMonth = startOfMonth(fromISO(startMonthIso));
  const maxMonth = startOfMonth(fromISO(maxMonthIso));

  const patchDay = useCallback((iso: string, patch: Partial<DaySummary>) => {
    setDays((prev) => {
      const cur =
        prev[iso] ??
        ({ date: iso, bid_amount: 0, product_name: null, category: null, bidders: 0, locked: false } as DaySummary);
      return { ...prev, [iso]: { ...cur, ...patch } };
    });
  }, []);

  // Realtime: keep the grid live as bids land.
  useEffect(() => {
    if (!supabaseReady) return;
    const sb = getBrowserClient();
    if (!sb) return;

    const ch = sb
      .channel("astrobid-grid")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "launches" },
        (payload: any) => {
          const row = payload.new ?? payload.old;
          if (!row?.date) return;
          patchDay(row.date, {
            bid_amount: row.bid_amount ?? 0,
            product_name: row.product_name ?? null,
            category: row.category ?? null,
            locked: Boolean(row.locked),
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bids" },
        (payload: any) => {
          const row = payload.new ?? payload.old;
          if (!row?.launch_date || row.status !== "paid") return;
          setDays((prev) => {
            const cur = prev[row.launch_date];
            const bidders = cur?.bidders ?? 0;
            return {
              ...prev,
              [row.launch_date]: {
                date: row.launch_date,
                bid_amount: Math.max(cur?.bid_amount ?? 0, row.amount ?? 0),
                product_name: cur?.product_name ?? row.product_name ?? null,
                category: cur?.category ?? row.category ?? null,
                bidders: payload.eventType === "INSERT" ? bidders + 1 : bidders,
                locked: cur?.locked ?? false,
              },
            };
          });
        },
      )
      .subscribe();

    return () => {
      sb.removeChannel(ch);
    };
  }, [supabaseReady, patchDay]);

  const grid = useMemo(() => monthGrid(view), [view]);
  const canPrev = startOfMonth(view) > minMonth;
  const canNext = startOfMonth(view) < maxMonth;

  const step = (n: number) => {
    setView((v) => {
      const next = startOfMonth(addMonths(v, n));
      if (next < minMonth) return minMonth;
      if (next > maxMonth) return maxMonth;
      return next;
    });
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden px-2 py-2 sm:px-5 sm:py-4">
      {/* Header */}
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 pb-2 sm:pb-3">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="AstroBid" className="h-7 w-7 sm:h-9 sm:w-9" />
          <span className="text-lg font-extrabold tracking-tight glow sm:text-2xl">AstroBid</span>
        </div>

        <div className="order-3 flex items-center gap-1 sm:order-2">
          <button
            aria-label="Previous month"
            onClick={() => step(-1)}
            disabled={!canPrev}
            className="btn-ghost h-8 w-8 !px-0 text-base disabled:opacity-30"
          >
            ‹
          </button>
          <h1 className="min-w-[9.5rem] text-center text-base font-bold glow-soft sm:min-w-[12rem] sm:text-xl">
            {MONTHS[view.getMonth()]} {view.getFullYear()}
          </h1>
          <button
            aria-label="Next month"
            onClick={() => step(1)}
            disabled={!canNext}
            className="btn-ghost h-8 w-8 !px-0 text-base disabled:opacity-30"
          >
            ›
          </button>
          <button
            onClick={() => setView(minMonth)}
            className="btn-ghost ml-1 h-8 !py-0 !px-2.5 text-xs"
          >
            Today
          </button>
        </div>

        <nav className="order-2 ml-auto flex items-center gap-2 text-xs sm:order-3 sm:text-sm">
          <Link href="/stats" className="text-violet-200/80 hover:text-white">
            Stats
          </Link>
          <span className="text-white/20">·</span>
          <Link href="/archive" className="text-violet-200/80 hover:text-white">
            Archive
          </Link>
        </nav>

        <p className="order-4 w-full text-[11px] leading-tight text-violet-200/50 sm:text-xs">
          Highest bid <span className="text-violet-200/80">48h before the day</span> wins the launch
          spotlight. No refunds. Hover a day to see why it&apos;s good for shipping.
          {PAYMENT_BANNER[paymentMode] && (
            <span className="ml-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-300">
              {PAYMENT_BANNER[paymentMode]}
            </span>
          )}
        </p>
      </header>

      {/* Grid */}
      <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-1">
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="text-center text-[10px] font-semibold uppercase tracking-wider text-violet-200/40 sm:text-xs"
            >
              <span className="sm:hidden">{w[0]}</span>
              <span className="hidden sm:inline">{w}</span>
            </div>
          ))}
        </div>

        <div className="grid min-h-0 grid-cols-7 grid-rows-6 gap-1 sm:gap-1.5">
          {grid.map((d) => {
            const iso = toISO(d);
            const inMonth = d.getMonth() === view.getMonth();
            const isToday = iso === today;
            const isPast = iso < today;
            const summary = days[iso];
            const insight = getDayInsight(iso);
            const bid = summary?.bid_amount ?? 0;
            const clickable = inMonth && !isPast;

            return (
              <button
                key={iso}
                disabled={!inMonth || (isPast && !summary?.product_name)}
                onClick={() => setSelected(iso)}
                onMouseEnter={(e) => {
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setHover({ iso, x: r.left + r.width / 2, y: r.top });
                }}
                onMouseLeave={() => setHover((h) => (h?.iso === iso ? null : h))}
                className={[
                  "group relative flex min-h-0 flex-col overflow-hidden rounded-lg border p-1 text-left transition sm:rounded-xl sm:p-2",
                  inMonth
                    ? "border-cosmos-border bg-cosmos-card/60 hover:border-violet-400/70 hover:bg-cosmos-card"
                    : "border-transparent bg-white/[0.015] opacity-40",
                  isToday ? "ring-1 ring-violet-400/70" : "",
                  clickable ? "cursor-pointer" : "cursor-default",
                ].join(" ")}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={[
                      "text-xs font-bold leading-none sm:text-sm",
                      isToday ? "text-violet-200 glow-soft" : "text-white/80",
                    ].join(" ")}
                  >
                    {d.getDate()}
                  </span>
                  {summary?.locked && <span className="text-[10px]">🔒</span>}
                </div>

                {inMonth && (
                  <div
                    className="mt-0.5 truncate text-[9px] leading-none text-cosmos-star sm:text-[11px]"
                    aria-label={`${insight.score} of 5 launch stars`}
                  >
                    {"⭐".repeat(insight.score)}
                  </div>
                )}

                <div className="mt-auto min-w-0">
                  {bid > 0 ? (
                    <div className="truncate">
                      <span className="text-[11px] font-extrabold text-violet-200 glow-soft sm:text-sm">
                        {money(bid)}
                      </span>
                      {summary?.product_name && (
                        <span className="ml-1 hidden truncate text-[10px] text-white/45 sm:inline">
                          {summary.product_name}
                        </span>
                      )}
                    </div>
                  ) : inMonth && !isPast ? (
                    <span className="text-[10px] text-white/25 group-hover:text-violet-200/70 sm:text-[11px]">
                      open · bid
                    </span>
                  ) : null}
                  {inMonth && (summary?.bidders ?? 0) > 0 && (
                    <div className="text-[9px] text-white/30 sm:text-[10px]">
                      {summary!.bidders} bid{summary!.bidders === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hover tooltip */}
      {hover && (
        <HoverCard
          iso={hover.iso}
          x={hover.x}
          y={hover.y}
        />
      )}

      {selected && (
        <DayModal
          date={selected}
          maxMonthIso={maxMonthIso}
          supabaseReady={supabaseReady}
          paymentMode={paymentMode}
          onLocalUpdate={patchDay}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function HoverCard({ iso, x, y }: { iso: string; x: number; y: number }) {
  const insight = getDayInsight(iso);
  const d = fromISO(iso);
  const left = Math.max(12, Math.min(x - 130, (typeof window !== "undefined" ? window.innerWidth : 1000) - 272));
  const top = y - 8;
  return (
    <div
      className="pointer-events-none fixed z-50 hidden w-64 -translate-y-full rounded-xl border border-cosmos-border bg-cosmos-panel/95 p-3 shadow-glow backdrop-blur md:block"
      style={{ left, top }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white/70">
          {WEEKDAYS[d.getDay()]} {MONTHS[d.getMonth()]} {d.getDate()}
        </span>
        <span className="text-[11px] text-cosmos-star">{"⭐".repeat(insight.score)}</span>
      </div>
      <div className="mt-1 text-sm font-bold text-violet-200 glow-soft">{insight.headline}</div>
      <p className="mt-1 text-xs leading-snug text-white/60">{insight.reason}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {insight.tags.map((t) => (
          <span key={t} className="chip !text-[10px]">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
