import PageHeader from "@/components/PageHeader";
import { getStats } from "@/lib/data";
import { humanDate, MONTHS } from "@/lib/date";
import { money as usd } from "@/lib/money";

export const dynamic = "force-dynamic";

function monthLabel(m: string): string {
  const [y, mm] = m.split("-").map(Number);
  return `${MONTHS[mm - 1].slice(0, 3)} ${y}`;
}

export default async function StatsPage() {
  const s = await getStats();
  const maxMonth = Math.max(1, ...s.biddersByMonth.map((m) => m.bidders));

  return (
    <main className="min-h-[100dvh] pb-16">
      <PageHeader active="stats" />
      <div className="mx-auto max-w-5xl px-4">
        <h1 className="text-2xl font-extrabold glow">The numbers</h1>
        <p className="mt-1 text-sm text-white/50">
          Everything below is live from paid bids.
        </p>

        {!s.configured && (
          <p className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Supabase isn&apos;t connected yet — stats will populate once it is.
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Total revenue" value={usd(s.totalRevenue)} />
          <Tile label="Paid bids" value={String(s.paidBids)} />
          <Tile label="Total bids" value={String(s.totalBids)} />
          <Tile label="Days claimed" value={String(s.activeDays)} />
        </div>

        <section className="mt-10 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-violet-200/50">
              Top 10 most expensive days
            </h2>
            <div className="mt-3 space-y-1.5">
              {s.topDays.length === 0 && (
                <p className="text-sm text-white/30">No paid days yet.</p>
              )}
              {s.topDays.map((d, i) => (
                <div
                  key={d.date}
                  className="flex items-center justify-between rounded-lg border border-cosmos-border bg-cosmos-card/50 px-3 py-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="w-5 text-white/35">{i + 1}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-white">
                        {d.product_name || "—"}
                      </span>
                      <span className="block truncate text-xs text-white/40">
                        {humanDate(d.date)} · {d.category || "—"}
                      </span>
                    </span>
                  </span>
                  <span className="font-extrabold text-violet-200 glow-soft">{usd(d.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-violet-200/50">
              Bidders per month
            </h2>
            <div className="mt-3 space-y-2">
              {s.biddersByMonth.length === 0 && (
                <p className="text-sm text-white/30">No bids yet.</p>
              )}
              {s.biddersByMonth.map((m) => (
                <div key={m.month} className="text-sm">
                  <div className="mb-1 flex justify-between text-xs text-white/50">
                    <span>{monthLabel(m.month)}</span>
                    <span>
                      {m.bidders} bid{m.bidders === 1 ? "" : "s"} · {usd(m.revenue)}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400"
                      style={{ width: `${(m.bidders / maxMonth) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel px-4 py-4">
      <div className="text-xs uppercase tracking-wider text-violet-200/50">{label}</div>
      <div className="mt-1 text-2xl font-extrabold glow-soft">{value}</div>
    </div>
  );
}
