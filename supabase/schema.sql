-- ============================================================================
-- AstroBid — database schema
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- Safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- users : one row per bidder email (no auth; email captured at payment time)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  name        text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- bids : every bid ever placed (the leaderboard + archive live here)
-- ---------------------------------------------------------------------------
create table if not exists public.bids (
  id               uuid primary key default gen_random_uuid(),
  launch_date      date not null,
  product_name     text not null,
  url              text not null default '',
  category         text not null,
  tagline          text,
  bidder_name      text,
  bidder_email     text not null,
  amount           integer not null check (amount > 0),   -- whole US dollars
  status           text not null default 'pending'
                     check (status in ('pending','paid','failed','refunded')),
  dodo_payment_id  text,
  created_at       timestamptz not null default now(),
  paid_at          timestamptz
);
create index if not exists bids_date_idx        on public.bids (launch_date);
create index if not exists bids_status_idx      on public.bids (status);
create index if not exists bids_date_amount_idx on public.bids (launch_date, amount desc);

-- ---------------------------------------------------------------------------
-- launches : the current winning launch for a given day
-- ---------------------------------------------------------------------------
create table if not exists public.launches (
  id             uuid primary key default gen_random_uuid(),
  date           date unique not null,
  product_name   text,
  url            text,
  category       text,
  tagline        text,
  description    text,
  logo_url       text,
  bid_amount     integer not null default 0,
  winner_bid_id  uuid references public.bids(id) on delete set null,
  winner_id      uuid references public.users(id) on delete set null,
  edit_token     uuid not null default gen_random_uuid(),  -- private key the winner edits with
  locked         boolean not null default false,           -- true once bidding closed (48h out)
  claimed_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists launches_date_idx   on public.launches (date);
create index if not exists launches_amount_idx on public.launches (bid_amount desc);

-- ---------------------------------------------------------------------------
-- payments : successful (and attempted) Dodo transactions, for stats
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references public.users(id) on delete set null,
  bid_id                uuid references public.bids(id) on delete set null,
  amount                integer not null,
  dodo_transaction_id   text,
  status                text not null default 'created',
  created_at            timestamptz not null default now()
);
create index if not exists payments_status_idx on public.payments (status);

-- ============================================================================
-- Row Level Security
--   Reads: public (anonymous).  Writes: service-role only (via API routes).
-- ============================================================================
alter table public.users    enable row level security;
alter table public.bids     enable row level security;
alter table public.launches enable row level security;
alter table public.payments enable row level security;

drop policy if exists "public read launches" on public.launches;
create policy "public read launches" on public.launches
  for select using (true);

drop policy if exists "public read paid bids" on public.bids;
create policy "public read paid bids" on public.bids
  for select using (status = 'paid');

-- users & payments have no public policy => not readable by anon (only service role).

-- ============================================================================
-- Realtime : broadcast changes on launches + bids to subscribed clients
-- ============================================================================
alter table public.launches replica identity full;
alter table public.bids     replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.launches;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.bids;
  exception when duplicate_object then null;
  end;
end $$;
