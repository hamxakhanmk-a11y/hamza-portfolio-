-- Visitor statistics for the CMS "Visitors" tab.
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- One row per page view. No names, no IP addresses: a visitor is a random id kept in their browser.

create table if not exists public.site_visits (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  visitor text not null,          -- random id per browser (same person coming back = same id)
  session text not null,          -- random id per visit (one browser tab session)
  path text not null,             -- the page, e.g. /portfolio
  referrer text,                  -- the website they came from, e.g. instagram.com (first page of a visit)
  country text,                   -- two-letter code, e.g. PK
  region text,
  city text,
  device text,                    -- phone / tablet / computer
  browser text,
  os text
);

create index if not exists site_visits_created_at_idx on public.site_visits (created_at desc);

-- Locked: no public access at all. Only the website's server (with the secret service key) can add or read rows.
alter table public.site_visits enable row level security;
