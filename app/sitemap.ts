import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { getServerClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/date";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/archive`, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/stats`, changeFrequency: "daily", priority: 0.5 },
  ];

  const db = getServerClient();
  if (!db) return routes;

  const { data } = await db
    .from("launches")
    .select("date, updated_at")
    .not("product_name", "is", null)
    .order("date", { ascending: false })
    .limit(5000);

  const today = todayISO();
  for (const l of (data ?? []) as { date: string; updated_at: string | null }[]) {
    routes.push({
      url: `${SITE_URL}/launch/${l.date}`,
      lastModified: l.updated_at ? new Date(l.updated_at) : undefined,
      changeFrequency: l.date < today ? "monthly" : "daily",
      priority: 0.7,
    });
  }

  return routes;
}
