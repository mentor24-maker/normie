-- Normie: idempotent incremental migration for existing Supabase projects.
-- Run once in the SQL Editor after an older schema.sql (or piecemeal migrations).
-- New projects: run ../schema.sql only (it already includes everything below).

-- ---------------------------------------------------------------------------
-- Polls: optional per-question image (used by /api/polls/next and builder)
-- ---------------------------------------------------------------------------
alter table public.polls
add column if not exists image_url text not null default '';

-- ---------------------------------------------------------------------------
-- Builder / shop tables (safe if already created via schema.sql)
-- ---------------------------------------------------------------------------
create table if not exists public.builder_cell_modules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  modules jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.builder_saved_sections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  section jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  product_type text not null default 'merch' check (product_type in ('merch', 'personality_profile')),
  product_url text not null default '',
  image_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists builder_cell_modules_updated_at_idx
on public.builder_cell_modules (updated_at desc);

create index if not exists builder_saved_sections_updated_at_idx
on public.builder_saved_sections (updated_at desc);

create index if not exists products_product_type_idx on public.products (product_type);

create index if not exists products_updated_at_idx on public.products (updated_at desc);

alter table public.builder_cell_modules enable row level security;
alter table public.builder_saved_sections enable row level security;
alter table public.products enable row level security;

-- ---------------------------------------------------------------------------
-- Public API rate limiting (server-only via service role; no anon policies)
-- ---------------------------------------------------------------------------
create table if not exists public.api_rate_limits (
  bucket text primary key,
  hits integer not null default 1 check (hits > 0),
  expires_at timestamptz not null
);

create index if not exists api_rate_limits_expires_at_idx on public.api_rate_limits (expires_at);

alter table public.api_rate_limits enable row level security;

-- ---------------------------------------------------------------------------
-- RLS: public poll response inserts (anon client in /api/polls/answer)
-- ---------------------------------------------------------------------------
drop policy if exists "anon can insert poll_response for published polls" on public.poll_response;
create policy "anon can insert poll_response for published polls"
on public.poll_response
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.polls
    where public.polls.id = poll_id
      and public.polls.is_published = true
  )
  and exists (
    select 1
    from public.poll_options
    where public.poll_options.id = option_id
      and public.poll_options.poll_id = poll_id
  )
);
