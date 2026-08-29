import { NextResponse } from "next/server";
import { getAdminClient, hasServiceRole } from "@/lib/supabase/server";
import { isValidCategory } from "@/lib/categories";
import { MODERATION_BLOCK_MESSAGE, screenListing } from "@/lib/moderation";

export const dynamic = "force-dynamic";

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Winner-only edits to the public launch page, gated by the per-day edit token. */
export async function POST(req: Request) {
  if (!hasServiceRole) {
    return NextResponse.json({ error: "server not configured" }, { status: 503 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const date = String(body.date || "");
  const token = String(body.token || "");
  if (!ISO_RE.test(date) || !token) {
    return NextResponse.json({ error: "missing date or token" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data: launch } = await admin
    .from("launches")
    .select("id, edit_token")
    .eq("date", date)
    .maybeSingle();

  if (!launch || launch.edit_token !== token) {
    return NextResponse.json({ error: "invalid token" }, { status: 403 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.product_name === "string")
    patch.product_name = body.product_name.trim().slice(0, 80);
  if (typeof body.tagline === "string") patch.tagline = body.tagline.trim().slice(0, 140);
  if (typeof body.description === "string")
    patch.description = body.description.trim().slice(0, 4000);
  if (typeof body.url === "string") {
    const u = body.url.trim().slice(0, 300);
    if (u && !/^https?:\/\/.+\..+/.test(u))
      return NextResponse.json({ error: "bad url" }, { status: 400 });
    patch.url = u;
  }
  if (typeof body.logo_url === "string") {
    const u = body.logo_url.trim().slice(0, 300);
    if (u && !/^https?:\/\/.+\..+/.test(u))
      return NextResponse.json({ error: "bad logo url" }, { status: 400 });
    patch.logo_url = u;
  }
  if (typeof body.category === "string") {
    if (!isValidCategory(body.category))
      return NextResponse.json({ error: "bad category" }, { status: 400 });
    patch.category = body.category;
  }

  if (
    screenListing(
      patch.product_name as string,
      patch.tagline as string,
      patch.description as string,
      patch.url as string,
    )
  ) {
    return NextResponse.json({ error: MODERATION_BLOCK_MESSAGE }, { status: 422 });
  }

  const { error } = await admin.from("launches").update(patch).eq("id", launch.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
