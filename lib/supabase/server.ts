import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasServiceRole = Boolean(url && service);

/**
 * Server-side Supabase client. Prefers the service-role key (bypasses RLS) for
 * API routes and server components; falls back to the anon key for read-only use.
 * Returns null when nothing is configured so the app can still render.
 */
export function getServerClient(): SupabaseClient | null {
  if (!url) return null;
  const key = service || anon;
  if (!key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Strict admin client — throws if the service role key is missing. */
export function getAdminClient(): SupabaseClient {
  if (!url || !service) {
    throw new Error(
      "Supabase admin client unavailable: set SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.",
    );
  }
  return createClient(url, service, { auth: { persistSession: false } });
}
