import CalendarApp from "@/components/CalendarApp";
import { getDaySummaries } from "@/lib/data";
import { addDays, addMonths, startOfMonth, toISO } from "@/lib/date";
import { supabaseBrowserConfigured } from "@/lib/config";
import { paymentMode, paymentsTestMode } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const start = startOfMonth(new Date());
  const end = addDays(start, 400);
  const days = await getDaySummaries(toISO(start), toISO(end));

  return (
    <CalendarApp
      initialDays={days}
      startMonthIso={toISO(start)}
      maxMonthIso={toISO(addMonths(start, 12))}
      supabaseReady={supabaseBrowserConfigured()}
      paymentMode={paymentMode()}
      testMode={paymentsTestMode()}
    />
  );
}
