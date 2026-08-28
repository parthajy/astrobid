// Netlify Scheduled Function — hourly.
// Calls the app's own /api/cron/lock route so all the locking logic lives in one place.

export const config = { schedule: "@hourly" };

export default async () => {
  const base =
    process.env.NEXT_PUBLIC_APP_URL || process.env.URL || process.env.DEPLOY_PRIME_URL;
  if (!base) {
    return new Response("no base URL", { status: 500 });
  }

  const res = await fetch(`${base.replace(/\/$/, "")}/api/cron/lock`, {
    headers: process.env.CRON_SECRET
      ? { authorization: `Bearer ${process.env.CRON_SECRET}` }
      : {},
  });

  return new Response(await res.text(), { status: res.status });
};
