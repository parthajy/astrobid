import { NextResponse } from "next/server";
import { getDayDetail } from "@/lib/data";

export const dynamic = "force-dynamic";

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(_req: Request, { params }: { params: { date: string } }) {
  if (!ISO_RE.test(params.date)) {
    return NextResponse.json({ error: "bad date" }, { status: 400 });
  }
  const detail = await getDayDetail(params.date);
  return NextResponse.json(detail, {
    headers: { "Cache-Control": "no-store" },
  });
}
