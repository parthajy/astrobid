# 🪐 AstroBid

**Bid for the best day to launch.** A cosmic launch calendar where makers outbid
each other for a day in the spotlight. Whoever leads **48 hours before** the day
wins that day's launch page. No refunds. Built on the fame of `outbid.lol`.

- ⚡ Next.js (App Router) + React + TypeScript + Tailwind
- 🗄️ Supabase (Postgres + Realtime)
- 💳 Pluggable payments: `pledge` (no gateway) · Dodo · Razorpay · `mock`
- ▲ Deploys to **Vercel or Netlify** (both configured in-repo)
- 🔓 No login — email is captured at bid time so the winner can claim their page

---

## How it works

1. **Homepage is the calendar.** The whole month fits on screen — no scrolling.
   Each day shows cosmic stars (⭐ launch-day potential, computed from the
   calendar — *no AI, no astrology*), the current winning bid, and bid count.
   Hover any day to see *why* it's a good day to ship.
2. **Click a day → bid.** Enter product name, pick from 50 categories, add a URL
   and tagline, choose your bid (must beat the leader by at least 1 unit), enter
   your email, and pay / pledge. You can also **book ahead** — the modal offers
   the same date each month for the next year.
3. **Confirmed → you're on the leaderboard.** Everyone watching sees it live via
   Supabase Realtime.
4. **48h before the day, bidding locks.** The leader keeps the day and gets a
   private link to build a Product-Hunt-style launch page at `/launch/<date>`.
5. **Stats & Archive** pages show revenue, the priciest days, bidders per month,
   and every past launch.

---

## Quick start (local)

```bash
npm install
cp .env.example .env.local     # optional — the app runs without it
npm run dev                    # http://localhost:3000
```

With **no environment variables**, AstroBid runs in **demo mode**: the calendar,
insights and navigation all work, and "Pay via Dodo" uses a local mock checkout
that instantly confirms the bid. Add Supabase to persist data; add Dodo to take
real money.

---

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql).
   *(Optional: run [`supabase/seed.sql`](supabase/seed.sql) for demo data.)*
3. **Project Settings → API** — copy these into `.env.local` / Vercel:

   | Env var | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key |
   | `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key — **server only** |

Realtime is enabled by the schema (the `launches` and `bids` tables are added to
the `supabase_realtime` publication with public read RLS).

---

## 2. Choose a payment mode

Set `PAYMENTS_PROVIDER` (or leave it unset to auto-detect from whichever keys are
present). All modes share one code path — [`lib/payments/`](lib/payments/).

| `PAYMENTS_PROVIDER` | What happens | When to use |
| --- | --- | --- |
| `mock` | Instant local confirm, records a payment row | local dev |
| `pledge` | Bid is recorded, **no money taken**, no payment row | launch now, monetise later — invoice the winner manually 48h out |
| `dodo` | Dodo Payments hosted checkout (merchant of record, global USD) | original plan — blocked on Dodo onboarding |
| `razorpay` | Razorpay Payment Link (India / INR) | fastest real-money option for an Indian entity |

### `pledge` mode (recommended while Dodo is stuck)

Ship the calendar and leaderboard today. Bidders enter everything and "pledge" an
amount — it's recorded as a paid bid so the leaderboard and 48h-winner logic all
work, but `payments` stays empty so **Stats revenue stays truthful**. When a day
locks, email the winner a payment link (Razorpay/Stripe/PayPal/Wise) and collect
then. Copy on the modal already says "you'll be invoiced only if you win".

### `razorpay` mode

1. [dashboard.razorpay.com](https://dashboard.razorpay.com) → **Settings → API Keys** → generate.
2. **Settings → Webhooks** → add `https://YOUR-DOMAIN/api/webhook/razorpay`,
   events `payment_link.paid` + `payment.captured`, set a secret.
3. Env: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`,
   and `NEXT_PUBLIC_CURRENCY=INR`.

### `dodo` mode

1. Create **one product** priced **"Pay what you want"** (bids are dynamic). Copy its **Product ID**.
2. **Developer → API Keys** → create a key. **Developer → Webhooks** → endpoint
   `https://YOUR-DOMAIN/api/webhook/dodo`, **payment** events, copy the `whsec_…` secret.
3. Env: `DODO_API_KEY`, `DODO_PRODUCT_ID`, `DODO_MODE`, `DODO_WEBHOOK_SECRET`.

Every gateway webhook verifies its signature, marks the bid `paid`, upserts the
user, records the payment, and recomputes the day's winner. All idempotent — the
`/success` page re-confirms as a fallback.

> **What if Dodo never works out?** For your original goal (charge global
> customers in USD without your own entity) the real Dodo alternatives are
> **Polar.sh**, **Paddle**, or **Lemon Squeezy** — all merchants of record. Each
> slots in as one new file in `lib/payments/`. If INR is acceptable, **Razorpay**
> (already wired) or **Cashfree** onboard fastest. Or run `pledge` mode now and
> add a gateway once approved — no code change for existing bids.

Set `NEXT_PUBLIC_CURRENCY` (`USD`, `INR`, `EUR`, …) — it changes every amount
shown in the UI. Bid amounts are whole units of that currency.

---

## 3a. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push to GitHub and **Import** in Vercel (framework auto-detected).
2. Add every variable from `.env.example` in **Settings → Environment Variables**.
3. Deploy. [`vercel.json`](vercel.json) registers an hourly **cron** hitting
   `/api/cron/lock` (freezes each winner once its 48h window closes). Optional
   `CRON_SECRET` protects the route.
4. Point your payment webhook at `https://YOUR-DOMAIN/api/webhook/<provider>`.

## 3b. Deploy to Netlify (Supabase works the same either way)

Yes — Netlify + Supabase is fully supported. This repo ships
[`netlify.toml`](netlify.toml) already.

1. Push to GitHub and **Add new site → Import** in Netlify.
2. Build command `npm run build`, and it auto-installs
   `@netlify/plugin-nextjs` (App Router pages **and** `/api/*` route handlers run
   as Netlify Functions).
3. Add the same env vars in **Site configuration → Environment variables**. Set
   `NEXT_PUBLIC_APP_URL` to your Netlify URL (it's baked in at build time).
4. The 48h lock runs via the scheduled function
   [`netlify/functions/lock-launches.mjs`](netlify/functions/lock-launches.mjs)
   (`@hourly`) — it just calls `/api/cron/lock`. Nothing else to configure.
5. Point your payment webhook at `https://YOUR-SITE.netlify.app/api/webhook/<provider>`.

Supabase is unchanged: same project, same `schema.sql`, same keys.

---

## Project layout

```
app/
  page.tsx                     calendar homepage (full-viewport, no scroll)
  stats/ archive/              analytics + past launches
  success/                     post-payment confirmation
  launch/[date]/               public PH-style launch page
  launch/[date]/edit/          winner-only editor (gated by edit token)
  api/
    bid/                       POST: validate bid → create checkout (any provider)
    bid/[id]/                  GET:  outcome of a bid (for /success)
    day/[date]/                GET:  launch + leaderboard + min next bid
    webhook/dodo/              POST: Dodo payment webhook (signed)
    webhook/razorpay/          POST: Razorpay webhook (signed)
    settle/                    GET:  internal confirm for mock / pledge modes
    launch/update/             POST: winner edits their launch page
    cron/lock/                 GET:  lock days past the 48h cutoff
components/
  CalendarApp.tsx              client calendar + realtime grid
  DayModal.tsx                 outbid-style bidding modal + live preview
lib/
  payments/                    provider switch: index.ts, dodo.ts, razorpay.ts
  insights.ts                  deterministic "why this day" scoring (no AI)
  categories.ts                the 50 launch categories
  money.ts                     currency symbol + formatting
  finalize.ts                  idempotent "mark paid + recompute winner"
  data.ts / date.ts / types.ts
supabase/
  schema.sql  seed.sql
netlify/functions/lock-launches.mjs   hourly 48h-lock (Netlify)
```

## Rules baked in

- **Minimum bid:** `max(NEXT_PUBLIC_BASE_MIN_BID, current_leader + 1)`.
- **Bidding window:** closes 48h (local) before 00:00 of the launch day.
- **No refunds:** a bid (paid or pledged) is binding; being outbid does not refund it.
- **Booking horizon:** 365 days out.
- **Anonymous:** no accounts. The email on the bid is the only identity, and it's
  what the private `/launch/<date>/edit?token=…` link is tied to.

## Scripts

| Command | What |
| --- | --- |
| `npm run dev` | local dev server |
| `npm run build` | production build |
| `npm run start` | run the production build |
| `npm run lint` | eslint |
