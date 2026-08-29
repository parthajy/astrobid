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

/**
 * Origin of the actual incoming request — the source of truth for redirect and
 * return URLs, so payment flows work even if NEXT_PUBLIC_APP_URL was baked wrong.
 */
export function originFromRequest(req: Request): string {
  const h = req.headers;
  const proto = h.get("x-forwarded-proto")?.split(",")[0] || "https";
  const host = h.get("x-forwarded-host") || h.get("host");
  if (host) return `${proto}://${host}`;
  try {
    return new URL(req.url).origin;
  } catch {
    return appUrl();
  }
}

export function supabaseBrowserConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
