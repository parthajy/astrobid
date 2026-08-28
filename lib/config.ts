/** Shared runtime config + feature detection. */

export const BASE_MIN_BID = Number(process.env.NEXT_PUBLIC_BASE_MIN_BID || 5); // currency units
export const MIN_INCREMENT = 1; // must outbid by at least 1 unit
export const BOOKING_HORIZON_DAYS = 365;

/** Public base URL — works on Vercel, Netlify, or local. */
export function appUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  const vercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
  const netlify = process.env.URL || process.env.DEPLOY_PRIME_URL || "";
  return (explicit || vercel || netlify || "http://localhost:3000").replace(/\/$/, "");
}

export function supabaseBrowserConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
