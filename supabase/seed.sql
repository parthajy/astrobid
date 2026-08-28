-- ============================================================================
-- AstroBid — OPTIONAL demo seed
-- Populates a fresh database with a handful of paid bids so the calendar,
-- leaderboard, stats and archive have something to show.
--
-- Wipe it later with:
--   delete from public.payments; delete from public.launches;
--   delete from public.bids;     delete from public.users
--   where email like '%@demo.astrobid';
-- ============================================================================

do $$
declare
  rec   record;
  uid   uuid;
  bid   uuid;
  demo  jsonb := '[
    {"d": 9,  "p": "Nebula Notes",     "c": "Productivity",         "a": 45,  "t": "AI notes that actually organise themselves"},
    {"d": 12, "p": "PulseAuth",        "c": "Security & Privacy",   "a": 120, "t": "Passwordless auth in three lines"},
    {"d": 12, "p": "Cometly",          "c": "Marketing",            "a": 80,  "t": "Attribution without the spreadsheet"},
    {"d": 16, "p": "OrbitDB",          "c": "Databases",            "a": 210, "t": "Postgres branching for every PR"},
    {"d": 16, "p": "Stargate UI",      "c": "Design Tools",         "a": 150, "t": "Component library for space nerds"},
    {"d": 21, "p": "Lunar Ledger",     "c": "Fintech",              "a": 300, "t": "Books that close themselves"},
    {"d": 28, "p": "Meteor Mail",      "c": "Newsletters & Media",  "a": 65,  "t": "Newsletters at the speed of light"},
    {"d": 35, "p": "Gravity Forms AI", "c": "No-Code / Low-Code",   "a": 95,  "t": "Forms that ask the next question for you"},
    {"d": 47, "p": "Redshift Support", "c": "Customer Support",     "a": 175, "t": "Inbox zero, on autopilot"},
    {"d": 63, "p": "Astro Analytics",  "c": "Analytics & Data",     "a": 260, "t": "Product metrics without the SDK bloat"},
    {"d": 92, "p": "Cosmos Commerce",  "c": "E-commerce",           "a": 140, "t": "Headless storefronts in minutes"},
    {"d": -6, "p": "Solaris Sched",    "c": "SaaS",                 "a": 110, "t": "Scheduling that respects timezones"}
  ]'::jsonb;
begin
  for rec in select * from jsonb_array_elements(demo) as x(v)
  loop
    insert into public.users (email, name)
    values (lower(replace(rec.v->>'p',' ','')) || '@demo.astrobid', rec.v->>'p')
    on conflict (email) do update set name = excluded.name
    returning id into uid;

    insert into public.bids
      (launch_date, product_name, url, category, tagline,
       bidder_name, bidder_email, amount, status, dodo_payment_id, paid_at)
    values
      ((current_date + ((rec.v->>'d')::int)),
       rec.v->>'p',
       'https://' || lower(replace(rec.v->>'p',' ','')) || '.example.com',
       rec.v->>'c',
       rec.v->>'t',
       rec.v->>'p',
       lower(replace(rec.v->>'p',' ','')) || '@demo.astrobid',
       (rec.v->>'a')::int,
       'paid',
       'demo_' || md5(random()::text),
       now())
    returning id into bid;

    insert into public.payments (user_id, bid_id, amount, dodo_transaction_id, status)
    values (uid, bid, (rec.v->>'a')::int, 'demo_' || md5(random()::text), 'succeeded');
  end loop;

  -- Set each day's winner = highest paid bid for that day.
  insert into public.launches
    (date, product_name, url, category, tagline, bid_amount, winner_bid_id, claimed_at, updated_at)
  select distinct on (b.launch_date)
    b.launch_date, b.product_name, b.url, b.category, b.tagline, b.amount, b.id, now(), now()
  from public.bids b
  where b.status = 'paid'
  order by b.launch_date, b.amount desc, b.paid_at asc
  on conflict (date) do update set
    product_name  = excluded.product_name,
    url           = excluded.url,
    category      = excluded.category,
    tagline       = excluded.tagline,
    bid_amount    = excluded.bid_amount,
    winner_bid_id = excluded.winner_bid_id,
    updated_at    = now();
end $$;
