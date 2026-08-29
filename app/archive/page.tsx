import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import SiteFooter from "@/components/SiteFooter";
import { getArchive } from "@/lib/data";
import { humanDate } from "@/lib/date";
import { money } from "@/lib/money";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Launch archive",
  description:
    "Every past launch day on AstroBid — the product that claimed each day, its category, and what it paid.",
  alternates: { canonical: "/archive" },
};

export default async function ArchivePage() {
  const { rows, configured } = await getArchive();
  const totalRaised = rows.reduce((s, r) => s + r.bid_amount, 0);

  return (
    <main className="min-h-[100dvh] pb-16">
      <PageHeader active="archive" />
      <div className="mx-auto max-w-4xl px-4">
        <h1 className="text-2xl font-extrabold glow">Launch archive</h1>
        <p className="mt-1 text-sm t-muted">
          Days that have already come and gone — proof that {rows.length} product
          {rows.length === 1 ? "" : "s"} claimed a spotlight for a combined {money(totalRaised)}.
        </p>

        {!configured && (
          <p className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Connect Supabase to see past launches here.
          </p>
        )}

        <div className="mt-6 space-y-2">
          {configured && rows.length === 0 && (
            <p className="text-sm t-faint">No past launches yet. Check back soon.</p>
          )}
          {rows.map((r) => (
            <div
              key={r.date}
              className="panel flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-base font-bold t-ink">{r.product_name}</span>
                  <span className="chip !text-[10px]">{r.category}</span>
                </div>
                <div className="truncate text-xs t-faint">
                  {r.tagline || "—"}
                </div>
                <div className="mt-0.5 text-[11px] t-faint">
                  {humanDate(r.date)} · {r.bidders} paid bid{r.bidders === 1 ? "" : "s"}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-extrabold t-accent glow-soft">
                  {money(r.bid_amount)}
                </span>
                <Link href={`/launch/${r.date}`} className="btn-ghost !py-1.5 !text-xs">
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
