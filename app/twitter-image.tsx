import { renderOgCard } from "@/lib/og-card";

export const runtime = "nodejs";
export const alt = "AstroBid — bid for the best day to launch";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgCard();
}
