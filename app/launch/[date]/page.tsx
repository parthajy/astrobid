import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { getServerClient } from "@/lib/supabase/server";
import { biddingOpen, humanDate } from "@/lib/date";
import { getDayInsight } from "@/lib/insights";
import { money } from "@/lib/money";
import type { Launch } from "@/lib/types";

export const dynamic = "force-dynamic";

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function generateMetadata({
  params,
}: {
  params: { date: string };
}): Promise<Metadata> {
  if (!ISO_RE.test(params.date)) return {};
  const human = humanDate(params.date);
  const canonical = `/launch/${params.date}`;
  const db = getServerClient();

  type MetaRow = {
    product_name: string | null;
    tagline: string | null;
    category: string | null;
    logo_url: string | null;
  };

  let launch: MetaRow | null = null;
  if (db) {
    const { data } = await db
      .from("launches")
      .select("product_name, tagline, category, logo_url")
      .eq("date", params.date)
      .maybeSingle<MetaRow>();
    launch = data;
  }

  if (launch?.product_name) {
    const title = `${launch.product_name} — launching ${human}`;
    const description =
      launch.tagline ||
      `${launch.product_name} won the ${human} launch spotlight on AstroBid${
        launch.category ? ` in ${launch.category}` : ""
      }.`;
    const image = launch.logo_url || "/logo.png";
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { type: "article", title, description, url: canonical, images: [image] },
      twitter: { card: "summary_large_image", title, description, images: [image] },
    };
  }

  const insight = getDayInsight(params.date);
  return {
    title: `${human} — open for bids`,
    description: `${insight.headline}: ${insight.reason} Bid now to claim the ${human} launch spotlight on AstroBid.`,
    alternates: { canonical },
  };
}

export default async function LaunchPage({ params }: { params: { date: string } }) {
  if (!ISO_RE.test(params.date)) notFound();
  const date = params.date;
  const insight = getDayInsight(date);
  const db = getServerClient();

  let launch: Launch | null = null;
  let bidders = 0;
  if (db) {
    const [{ data: l }, { count }] = await Promise.all([
      db.from("launches").select("*").eq("date", date).maybeSingle<Launch>(),
      db
        .from("bids")
        .select("*", { count: "exact", head: true })
        .eq("launch_date", date)
        .eq("status", "paid"),
    ]);
    launch = l ?? null;
    bidders = count ?? 0;
  }

  const claimed = Boolean(launch?.product_name);
  const open = biddingOpen(date);

  return (
    <main className="min-h-[100dvh] pb-16">
      <PageHeader />
      <div className="mx-auto max-w-2xl px-4">
        <div className="text-xs uppercase tracking-widest t-accent">
          {humanDate(date)} · {insight.headline} {"⭐".repeat(insight.score)}
        </div>

        {!claimed ? (
          <div className="panel mt-4 px-6 py-10 text-center">
            <div className="text-4xl">✦</div>
            <h1 className="mt-3 text-xl font-extrabold glow">This day is still open</h1>
            <p className="mt-2 text-sm t-muted">{insight.reason}</p>
            <Link href={`/day/${date}`} className="btn-primary mt-5">
              Bid for {humanDate(date).split(",")[1]}
            </Link>
          </div>
        ) : (
          <article className="panel mt-4 overflow-hidden">
            <div className="border-b border-cosmos-border bg-gradient-to-br from-violet-500/15 to-indigo-500/5 px-6 py-6">
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={launch!.logo_url || "/logo.png"}
                  alt={launch!.product_name || "logo"}
                  className="h-16 w-16 rounded-2xl border border-cosmos-border surface-alt object-cover"
                />
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-extrabold glow">{launch!.product_name}</h1>
                  <p className="text-sm t-muted">{launch!.tagline || "Launching soon."}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="chip">{launch!.category || "Other"}</span>
                <span className="chip">
                  Won this day for{" "}
                  <span className="ml-1 font-extrabold t-accent">
                    {money(launch!.bid_amount)}
                  </span>
                </span>
                <span className="chip">{bidders} paid bid{bidders === 1 ? "" : "s"}</span>
                {launch!.locked ? (
                  <span className="chip !text-emerald-700">winner locked</span>
                ) : open ? (
                  <span className="chip !text-amber-700">bidding still open</span>
                ) : (
                  <span className="chip">closing</span>
                )}
              </div>
            </div>

            <div className="px-6 py-6">
              {launch!.description ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed t-ink">
                  {launch!.description}
                </p>
              ) : (
                <p className="text-sm t-faint">
                  The maker hasn&apos;t added launch details yet.
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                {launch!.url && (
                  <a
                    href={launch!.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="btn-primary"
                  >
                    Visit {launch!.product_name} ↗
                  </a>
                )}
                {open && !launch!.locked && (
                  <Link href={`/day/${date}`} className="btn-ghost">
                    Outbid this
                  </Link>
                )}
              </div>
            </div>
          </article>
        )}

        <p className="mt-6 text-center text-xs t-faint">
          <Link href="/" className="hover:underline">
            ← Back to the AstroBid calendar
          </Link>
        </p>
      </div>
    </main>
  );
}
