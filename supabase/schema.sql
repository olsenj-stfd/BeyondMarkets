-- RegScout schema. Run this in the Supabase SQL editor (Dashboard → SQL Editor).

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text not null,
  matches jsonb not null default '[]'::jsonb,
  follow_ups jsonb not null default '[]'::jsonb,
  -- Live federal regulatory search results (eCFR sections + open Federal
  -- Register rulemakings): [{ id, source, kind, title, citation, ... }].
  regulations jsonb not null default '[]'::jsonb,
  -- Cached opportunity ranking: [{ id, relevance, whyRelevant }]. Joined back
  -- to live `opportunities` on read so stale/expired items drop out.
  ranked_opportunities jsonb not null default '[]'::jsonb,
  ranked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill the ranking-cache columns for projects created before this migration.
alter table public.projects
  add column if not exists ranked_opportunities jsonb not null default '[]'::jsonb;
alter table public.projects
  add column if not exists ranked_at timestamptz;
alter table public.projects
  add column if not exists regulations jsonb not null default '[]'::jsonb;

create index if not exists projects_user_id_created_at_idx
  on public.projects (user_id, created_at desc);

-- Row-level security: a user can only see and modify their own projects.
alter table public.projects enable row level security;

drop policy if exists "own projects: select" on public.projects;
create policy "own projects: select" on public.projects
  for select using (auth.uid() = user_id);

drop policy if exists "own projects: insert" on public.projects;
create policy "own projects: insert" on public.projects
  for insert with check (auth.uid() = user_id);

drop policy if exists "own projects: update" on public.projects;
create policy "own projects: update" on public.projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own projects: delete" on public.projects;
create policy "own projects: delete" on public.projects
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Opportunities: dated, real-source items (grant deadlines, comment periods)
-- ingested from public APIs. Global/public data, not user-scoped.
-- ---------------------------------------------------------------------------

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  -- where it came from: 'federal_register' | 'grants_gov' | 'ca_grants'
  source text not null,
  -- the source's own stable id (document_number / opportunity id / PortalID)
  source_id text not null,
  -- 'comment_period' | 'grant_deadline'
  type text not null,
  title text not null,
  agency text,
  -- 'federal' | 'california'
  jurisdiction text not null,
  -- coarse topical domain for cheap prefiltering: air, water, energy, climate, ...
  domain text,
  tags text[] not null default '{}',
  summary text,
  url text not null,
  open_date date,
  -- the actionable date (comment close / application deadline)
  deadline date,
  status text,
  -- the untouched source record, for provenance and future fields
  raw jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  unique (source, source_id)
);

create index if not exists opportunities_deadline_idx
  on public.opportunities (deadline);
create index if not exists opportunities_domain_idx
  on public.opportunities (domain);

-- Public, read-only to everyone (including anon). Writes happen only from the
-- server-side ingestion route using a privileged key, so no write policy is
-- granted to anon/authenticated roles.
alter table public.opportunities enable row level security;

drop policy if exists "opportunities: public read" on public.opportunities;
create policy "opportunities: public read" on public.opportunities
  for select using (true);

-- ---------------------------------------------------------------------------
-- Favorites: opportunities a user stars to track. Roll up to the dashboard.
-- ---------------------------------------------------------------------------

create table if not exists public.opportunity_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);

create index if not exists opportunity_favorites_user_idx
  on public.opportunity_favorites (user_id);

alter table public.opportunity_favorites enable row level security;

drop policy if exists "favorites: select own" on public.opportunity_favorites;
create policy "favorites: select own" on public.opportunity_favorites
  for select using (auth.uid() = user_id);

drop policy if exists "favorites: insert own" on public.opportunity_favorites;
create policy "favorites: insert own" on public.opportunity_favorites
  for insert with check (auth.uid() = user_id);

drop policy if exists "favorites: delete own" on public.opportunity_favorites;
create policy "favorites: delete own" on public.opportunity_favorites
  for delete using (auth.uid() = user_id);
