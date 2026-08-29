import { NextResponse } from "next/server";
import { getAdminClient, hasServiceRole } from "@/lib/supabase/server";
import { lockClosedLaunches } from "@/lib/finalize";

export const dynamic = "force-dynamic";

/**
 * Locks every launch whose 24h bidding window has closed, freezing the winner.
 * Wired to Vercel Cron (see vercel.json). Protect with CRON_SECRET if set.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  if (!hasServiceRole) {
    return NextResponse.json({ error: "server not configured" }, { status: 503 });
  }

  const locked = await lockClosedLaunches(getAdminClient());
  return NextResponse.json({ ok: true, locked });
}
