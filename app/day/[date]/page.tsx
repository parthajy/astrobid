import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DayView from "./DayView";
import { getDayInsight } from "@/lib/insights";
import { addDays, humanDate, toISO } from "@/lib/date";
import { BOOKING_HORIZON_DAYS, supabaseBrowserConfigured } from "@/lib/config";
import { paymentMode, paymentsTestMode } from "@/lib/payments";

export const dynamic = "force-dynamic";

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function generateMetadata({
  params,
}: {
  params: { date: string };
}): Promise<Metadata> {
  if (!ISO_RE.test(params.date)) return {};
  const human = humanDate(params.date);
  const insight = getDayInsight(params.date);
  return {
    title: `Bid for ${human}`,
    description: `${insight.headline}: ${insight.reason} Claim the #1 launch spot for ${human} on AstroBid.`,
    alternates: { canonical: `/day/${params.date}` },
    robots: { index: false, follow: true },
  };
}

export default function DayPage({ params }: { params: { date: string } }) {
  if (!ISO_RE.test(params.date)) notFound();
  return (
    <DayView
      date={params.date}
      supabaseReady={supabaseBrowserConfigured()}
      paymentMode={paymentMode()}
      testMode={paymentsTestMode()}
      maxDateIso={toISO(addDays(new Date(), BOOKING_HORIZON_DAYS))}
    />
  );
}
