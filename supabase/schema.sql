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
  -- Live web-research digest ("things to consider"): [{ point, source, url }].
  considerations jsonb not null default '[]'::jsonb,
  -- When the web digest was last refreshed.
  digested_at timestamptz,
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
alter table public.projects
  add column if not exists considerations jsonb not null default '[]'::jsonb;
alter table public.projects
  add column if not exists digested_at timestamptz;

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

-- ---------------------------------------------------------------------------
-- Feedback: beta testers' notes. Users submit their own; reading is left to
-- the team via the Supabase dashboard (no broad select policy).
-- ---------------------------------------------------------------------------

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text,
  category text,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_at_idx
  on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- A signed-in user can submit feedback as themselves and read back their own.
drop policy if exists "feedback: insert own" on public.feedback;
create policy "feedback: insert own" on public.feedback
  for insert with check (auth.uid() = user_id);

-- Signed-out visitors can submit too (the login page links to the feedback
-- form). Anonymous rows carry no user_id and at most a self-reported email.
drop policy if exists "feedback: insert anon" on public.feedback;
create policy "feedback: insert anon" on public.feedback
  for insert to anon with check (user_id is null);

drop policy if exists "feedback: select own" on public.feedback;
create policy "feedback: select own" on public.feedback
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Portfolios: a VC / platform team scores a set of companies together. Each
-- company (and its cached score) lives in the `companies` jsonb array.
-- ---------------------------------------------------------------------------

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  -- [{ id, name, description, sector, stage, geography, score, scoredAt }]
  companies jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portfolios_user_id_created_at_idx
  on public.portfolios (user_id, created_at desc);

alter table public.portfolios enable row level security;

drop policy if exists "own portfolios: select" on public.portfolios;
create policy "own portfolios: select" on public.portfolios
  for select using (auth.uid() = user_id);

drop policy if exists "own portfolios: insert" on public.portfolios;
create policy "own portfolios: insert" on public.portfolios
  for insert with check (auth.uid() = user_id);

drop policy if exists "own portfolios: update" on public.portfolios;
create policy "own portfolios: update" on public.portfolios
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own portfolios: delete" on public.portfolios;
create policy "own portfolios: delete" on public.portfolios
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Usage counters: beta budget guard. One row per counter key ('global' plus
-- 'user:<uuid>'), incremented atomically via the security-definer function so
-- signed-in sessions can bump counts without any table write policy. Caps are
-- enforced in the API routes (lib/usage.ts). NOTE: until this migration runs,
-- the guard fails open so the app keeps working — run it before sharing.
-- ---------------------------------------------------------------------------

create table if not exists public.usage_counters (
  key text primary key,
  count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.usage_counters enable row level security;

drop policy if exists "usage: read" on public.usage_counters;
create policy "usage: read" on public.usage_counters
  for select to authenticated using (true);

create or replace function public.increment_usage(counter_key text)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.usage_counters as u (key, count)
  values (counter_key, 1)
  on conflict (key) do update
    set count = u.count + 1, updated_at = now()
  returning count;
$$;

revoke execute on function public.increment_usage(text) from public, anon;
grant execute on function public.increment_usage(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Shared report snapshots: an immutable copy of a portfolio report behind an
-- unguessable token, so a report can be sent as a clean public link. Public
-- read is by exact primary-key token only — possession of the link is the
-- credential (fine for beta; add expiry/revocation UI later if needed).
-- ---------------------------------------------------------------------------

create table if not exists public.report_shares (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  portfolio_name text not null,
  companies jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.report_shares enable row level security;

drop policy if exists "report shares: public read" on public.report_shares;
create policy "report shares: public read" on public.report_shares
  for select using (true);

drop policy if exists "report shares: insert own" on public.report_shares;
create policy "report shares: insert own" on public.report_shares
  for insert with check (auth.uid() = user_id);

drop policy if exists "report shares: delete own" on public.report_shares;
create policy "report shares: delete own" on public.report_shares
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Event taxonomy: opportunities gain a typed event classification and the key
-- dates that make non-open items relevant (a final rule's effective date, a
-- temporary rule's expiration). Existing rows are backfilled from `type`.
-- ---------------------------------------------------------------------------

alter table public.opportunities
  add column if not exists event_type text;
alter table public.opportunities
  add column if not exists effective_date date;
alter table public.opportunities
  add column if not exists expiration_date date;

update public.opportunities
  set event_type = case type
    when 'comment_period' then 'nprm_open_comment'
    when 'grant_deadline' then 'grant_open'
  end
  where event_type is null;

create index if not exists opportunities_event_type_idx
  on public.opportunities (event_type);
create index if not exists opportunities_effective_date_idx
  on public.opportunities (effective_date);

-- ---------------------------------------------------------------------------
-- Source registry: data-driven list of everything the ingest cron scans, so
-- sources can be added per sector/state without code changes. `fetch_method`
-- selects the adapter: 'api' (named built-in), 'rss' (generic feed reader),
-- 'scrape' (not yet implemented), 'manual' (tracked but not auto-ingested).
-- Rows seeded inactive are deliberate deferrals — see `notes`.
-- ---------------------------------------------------------------------------

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  url text not null,
  -- primary_federal | agency_newsroom | state | intermediary
  source_type text not null,
  jurisdiction text not null default 'federal',
  tier smallint not null default 1,
  -- daily | weekly | monthly
  crawl_cadence text not null default 'weekly',
  sectors text[] not null default '{}',
  -- api | rss | scrape | manual
  fetch_method text not null,
  -- named built-in adapter for fetch_method='api'
  adapter text,
  config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  last_fetched_at timestamptz,
  last_status text,
  notes text
);

alter table public.sources enable row level security;

drop policy if exists "sources: public read" on public.sources;
create policy "sources: public read" on public.sources
  for select using (true);

-- Seed the registry (no-ops on names that already exist, so it's re-runnable
-- and manual edits to existing rows are preserved).
insert into public.sources
  (name, url, source_type, jurisdiction, tier, crawl_cadence, sectors, fetch_method, adapter, active, notes)
values
  -- Tier 1: federal primary APIs
  ('grants_gov', 'https://api.grants.gov/v1/api/search2', 'primary_federal', 'federal', 1, 'daily', '{}', 'api', 'grants_gov', true, 'Posted NOFOs with close dates.'),
  ('grants_gov_forecasted', 'https://api.grants.gov/v1/api/search2', 'primary_federal', 'federal', 1, 'weekly', '{}', 'api', 'grants_gov_forecasted', true, 'Forecasted NOFOs (no close date yet).'),
  ('federal_register', 'https://www.federalregister.gov/api/v1/documents.json', 'primary_federal', 'federal', 1, 'daily', '{}', 'api', 'federal_register', true, 'Proposed rules with open comment periods.'),
  ('federal_register_final', 'https://www.federalregister.gov/api/v1/documents.json', 'primary_federal', 'federal', 1, 'daily', '{}', 'api', 'federal_register_final', true, 'Final rules pending a future effective date + recently effective.'),
  ('regulations_gov', 'https://api.regulations.gov/v4/documents', 'primary_federal', 'federal', 1, 'daily', '{}', 'api', 'regulations_gov', true, 'Needs REGULATIONS_GOV_API_KEY.'),
  ('congress_gov', 'https://api.congress.gov/v3/bill', 'primary_federal', 'federal', 1, 'weekly', '{}', 'api', 'congress_gov', true, 'Recently-acted bills. Needs CONGRESS_GOV_API_KEY (free at api.congress.gov/sign-up); adapter no-ops without it.'),
  ('ca_grants', 'https://data.ca.gov/api/3/action/datastore_search', 'state', 'california', 1, 'daily', '{}', 'api', 'ca_grants', true, 'CA Grants Portal, active grants.'),
  ('unified_agenda', 'https://www.reginfo.gov', 'primary_federal', 'federal', 1, 'monthly', '{}', 'manual', null, false, 'DEFERRED: no clean API; bulk XML per season. Early-warning layer for planned rulemakings by RIN.'),
  ('usaspending', 'https://api.usaspending.gov', 'primary_federal', 'federal', 1, 'monthly', '{}', 'api', null, false, 'DEFERRED: award-flow data needs a scoring-integration design (who is winning money per sector).'),
  ('govinfo', 'https://api.govinfo.gov', 'primary_federal', 'federal', 1, 'monthly', '{}', 'api', null, false, 'DEFERRED: overlaps Federal Register + Congress.gov for our use.'),
  ('govtrack', 'https://www.govtrack.us', 'primary_federal', 'federal', 1, 'weekly', '{}', 'manual', null, false, 'GovTrack public API discontinued; Congress.gov covers bill status.'),
  -- Tier 1: agency newsrooms (verified RSS)
  ('dol_releases', 'https://www.dol.gov/rss/releases.xml', 'agency_newsroom', 'federal', 1, 'weekly', '{workforce}', 'rss', null, true, 'DOL press incl. ETA funding announcements.'),
  ('cfpb_newsroom', 'https://www.consumerfinance.gov/about-us/newsroom/feed/', 'agency_newsroom', 'federal', 1, 'weekly', '{consumer_finance}', 'rss', null, true, 'Enforcement + supervision signals for lenders.'),
  ('ftc_press', 'https://www.ftc.gov/feeds/press-release.xml', 'agency_newsroom', 'federal', 1, 'weekly', '{consumer_finance,economic_development}', 'rss', null, true, null),
  ('sec_press', 'https://www.sec.gov/news/pressreleases.rss', 'agency_newsroom', 'federal', 1, 'weekly', '{consumer_finance}', 'rss', null, true, null),
  -- Tier 1: agency newsrooms (no working feed found — deferred to scrape)
  ('hhs_press', 'https://www.hhs.gov/press-room', 'agency_newsroom', 'federal', 1, 'weekly', '{healthcare}', 'scrape', null, false, 'RSS 403s (bot-blocked); needs scrape adapter.'),
  ('samhsa_grants', 'https://www.samhsa.gov/grants', 'agency_newsroom', 'federal', 1, 'weekly', '{healthcare}', 'scrape', null, false, 'Dashboard page; needs scrape adapter.'),
  ('ed_press', 'https://www.ed.gov/about/news', 'agency_newsroom', 'federal', 1, 'weekly', '{education,workforce}', 'scrape', null, false, 'No working RSS found; needs scrape adapter.'),
  ('fsa_announcements', 'https://fsapartners.ed.gov/knowledge-center', 'agency_newsroom', 'federal', 1, 'weekly', '{education}', 'scrape', null, false, 'Dear Colleague letters / electronic announcements; needs scrape adapter.'),
  ('apprenticeship_gov', 'https://www.apprenticeship.gov/investments-tax-credits-and-tuition-support/open-funding-opportunities', 'agency_newsroom', 'federal', 1, 'weekly', '{workforce}', 'scrape', null, false, 'Open funding table; needs scrape adapter.'),
  ('hrsa_funding', 'https://www.hrsa.gov/grants/find-funding', 'agency_newsroom', 'federal', 1, 'weekly', '{healthcare}', 'scrape', null, false, 'JS-rendered app; needs scrape/API investigation.'),
  ('cdc_funding', 'https://www.cdc.gov/funding', 'agency_newsroom', 'federal', 1, 'weekly', '{healthcare}', 'scrape', null, false, 'Needs scrape adapter.'),
  ('doj_ojp_funding', 'https://www.ojp.gov/funding/explore/current-funding-opportunities', 'agency_newsroom', 'federal', 1, 'weekly', '{economic_development}', 'scrape', null, false, 'DOJ grants do NOT flow through Grants.gov; needs scrape adapter.'),
  ('cms_newsroom', 'https://www.cms.gov/newsroom', 'agency_newsroom', 'federal', 1, 'weekly', '{healthcare}', 'scrape', null, false, 'No working RSS found; waivers + state plan amendments.'),
  ('acf_press', 'https://acf.gov/media/press-releases', 'agency_newsroom', 'federal', 1, 'weekly', '{healthcare,workforce}', 'scrape', null, false, 'No working RSS found.'),
  ('dea_diversion', 'https://www.deadiversion.usdoj.gov', 'agency_newsroom', 'federal', 1, 'monthly', '{healthcare}', 'scrape', null, false, 'Telemedicine flexibility expirations force rulemaking.'),
  -- Tier 2: state (California first; verified RSS)
  ('ca_dfpi', 'https://dfpi.ca.gov/feed/', 'state', 'california', 2, 'weekly', '{consumer_finance}', 'rss', null, true, 'CA DFPI rulemaking/enforcement/licensing.'),
  ('ca_ag_news', 'https://oag.ca.gov/news/feed', 'state', 'california', 2, 'weekly', '{}', 'rss', null, true, 'CA AG press — enforcement early warning.'),
  ('ca_bppe', 'https://www.bppe.ca.gov', 'state', 'california', 2, 'monthly', '{education}', 'scrape', null, false, 'Private postsecondary regulation; needs scrape adapter.'),
  ('ca_workforce_boards', 'https://cwdb.ca.gov', 'state', 'california', 2, 'monthly', '{workforce,education}', 'scrape', null, false, 'CWDB + CCCCO Workforce Pell implementation; needs scrape adapter.'),
  ('ca_dhcs', 'https://www.dhcs.ca.gov', 'state', 'california', 2, 'monthly', '{healthcare}', 'scrape', null, false, 'Needs scrape adapter.'),
  ('ca_leginfo', 'https://leginfo.legislature.ca.gov', 'state', 'california', 2, 'weekly', '{}', 'manual', null, false, 'CA bill tracking; no stable public API — needs design.'),
  ('state_workforce_pell_registry', 'https://www.pa.gov', 'state', 'multi-state', 2, 'monthly', '{education,workforce}', 'manual', null, false, 'Per-state Workforce Pell approval windows (PA, WA wtb.wa.gov publish); build registry keyed by state.'),
  ('opioid_settlement_tracker', 'https://www.opioidsettlementtracker.com', 'state', 'multi-state', 2, 'monthly', '{healthcare}', 'scrape', null, false, 'Settlement fund allocation cycles.'),
  ('nmls_state_regulators', 'https://nationwidelicensingsystem.org', 'state', 'multi-state', 2, 'monthly', '{consumer_finance}', 'manual', null, false, 'State banking/finance regulators for lending companies.'),
  -- Tier 3: intermediaries and trackers (verified RSS)
  ('consumer_finance_monitor', 'https://www.consumerfinancemonitor.com/feed/', 'intermediary', 'federal', 3, 'weekly', '{consumer_finance}', 'rss', null, true, 'Ballard Spahr tracker — regime-shift signals for lending.'),
  ('higher_ed_dive', 'https://www.highereddive.com/feeds/news/', 'intermediary', 'federal', 3, 'weekly', '{education,workforce}', 'rss', null, true, null),
  ('inside_higher_ed', 'https://www.insidehighered.com/rss.xml', 'intermediary', 'federal', 3, 'weekly', '{education}', 'rss', null, true, null),
  ('nashp', 'https://nashp.org/feed/', 'intermediary', 'multi-state', 3, 'weekly', '{healthcare}', 'rss', null, true, 'State health policy incl. settlement resources.'),
  -- Tier 3: no working feed found (deferred) or paid (needs decision)
  ('new_america_edu', 'https://www.newamerica.org/education-policy/', 'intermediary', 'federal', 3, 'monthly', '{education,workforce}', 'scrape', null, false, 'No working RSS found.'),
  ('jff', 'https://www.jff.org', 'intermediary', 'federal', 3, 'monthly', '{workforce}', 'scrape', null, false, '/feed serves HTML; needs scrape adapter.'),
  ('national_skills_coalition', 'https://nationalskillscoalition.org', 'intermediary', 'federal', 3, 'monthly', '{workforce}', 'scrape', null, false, null),
  ('nasfaa', 'https://www.nasfaa.org/news', 'intermediary', 'federal', 3, 'monthly', '{education}', 'scrape', null, false, null),
  ('community_college_daily', 'https://www.ccdaily.com', 'intermediary', 'federal', 3, 'monthly', '{education,workforce}', 'scrape', null, false, null),
  ('kff', 'https://www.kff.org', 'intermediary', 'federal', 3, 'monthly', '{healthcare}', 'scrape', null, false, 'KFF trackers.'),
  ('national_council_wellbeing', 'https://www.thenationalcouncil.org', 'intermediary', 'federal', 3, 'monthly', '{healthcare}', 'scrape', null, false, null),
  ('georgetown_ccf', 'https://ccf.georgetown.edu', 'intermediary', 'federal', 3, 'monthly', '{healthcare}', 'scrape', null, false, null),
  ('naco', 'https://www.naco.org', 'intermediary', 'multi-state', 3, 'monthly', '{healthcare,workforce}', 'scrape', null, false, 'Opioid Solutions Center + workforce briefs.'),
  ('jd_supra_consumer_finance', 'https://www.jdsupra.com', 'intermediary', 'federal', 3, 'weekly', '{consumer_finance}', 'scrape', null, false, 'Topic feeds need account/URL investigation.'),
  ('instrumentl', 'https://www.instrumentl.com', 'intermediary', 'federal', 3, 'weekly', '{}', 'api', null, false, 'PAID — needs budget decision. Private foundation grants.'),
  ('candid', 'https://candid.org', 'intermediary', 'federal', 3, 'weekly', '{}', 'api', null, false, 'PAID — needs budget decision. Foundation Directory.')
on conflict (name) do nothing;
