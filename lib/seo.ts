import { appUrl } from "./config";

export const SITE_URL = appUrl();

export const SITE_NAME = "AstroBid";

export const SITE_DESCRIPTION =
  "A cosmic launch calendar. Outbid everyone for the day you ship — the highest bid 48 hours before the day wins the launch spotlight. No login, no refunds.";

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-LWBNTKQDWZ";

/** Whether to actually inject analytics (skip on localhost dev). */
export const ANALYTICS_ENABLED = Boolean(GA_ID) && process.env.NODE_ENV === "production";
