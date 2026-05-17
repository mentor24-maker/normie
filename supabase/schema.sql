-- Normie canonical database schema (idempotent).
--
-- New Supabase project:
--   1. Run this file in the SQL Editor.
--   2. Optionally run seed.sql.
--
-- Existing project that already ran an older schema:
--   1. Run migrations/000_incremental.sql
--   2. Run migrations/001_legacy_users_split.sql only if you still have admin rows in public.users.
--
-- RLS summary:
--   Public read (anon): published polls, poll_options, responses, pages.
--   Public write (anon): responses insert (validated in API + policy).
--   Server-only (service role): users, team_users, builder tables, products,
--     page_templates, api_rate_limits, and all admin mutations.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Polls
-- ---------------------------------------------------------------------------
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  category varchar,
  question text not null,
  image_url text not null default '',
  order_index integer not null unique,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (session_id, poll_id)
);

-- ---------------------------------------------------------------------------
-- Builder pages
-- ---------------------------------------------------------------------------
create table if not exists public.page_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template_kind text not null default 'modular',
  layout_sections jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  template_id uuid references public.page_templates(id) on delete set null,
  layout_sections jsonb not null default '[]'::jsonb,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Users: public leads (contact form) vs team (admin) in separate tables
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  full_name text not null default '',
  phone text not null default '',
  status text not null default 'lead' check (status in ('lead', 'active', 'unsubscribed', 'blocked')),
  source text not null default 'manual',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'editor' check (role in ('owner', 'admin', 'editor', 'viewer')),
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Builder library + shop catalog (admin-managed)
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

-- ---------------------------------------------------------------------------
-- Server-side rate limiting (no RLS policies; service role only)
-- ---------------------------------------------------------------------------
create table if not exists public.api_rate_limits (
  bucket text primary key,
  hits integer not null default 1 check (hits > 0),
  expires_at timestamptz not null
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists responses_poll_id_idx on public.responses (poll_id);
create index if not exists responses_session_id_idx on public.responses (session_id);
create index if not exists poll_options_poll_id_idx on public.poll_options (poll_id);
create index if not exists page_templates_updated_at_idx on public.page_templates (updated_at desc);
create index if not exists pages_updated_at_idx on public.pages (updated_at desc);
create index if not exists pages_slug_idx on public.pages (slug);
create unique index if not exists users_email_unique_idx on public.users (email);
create unique index if not exists users_email_lower_unique_idx on public.users (lower(email));
create index if not exists users_status_idx on public.users (status);
create index if not exists team_users_role_idx on public.team_users (role);
create index if not exists builder_cell_modules_updated_at_idx on public.builder_cell_modules (updated_at desc);
create index if not exists builder_saved_sections_updated_at_idx on public.builder_saved_sections (updated_at desc);
create index if not exists products_product_type_idx on public.products (product_type);
create index if not exists products_updated_at_idx on public.products (updated_at desc);
create index if not exists api_rate_limits_expires_at_idx on public.api_rate_limits (expires_at);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.responses enable row level security;
alter table public.page_templates enable row level security;
alter table public.pages enable row level security;
alter table public.users enable row level security;
alter table public.team_users enable row level security;
alter table public.builder_cell_modules enable row level security;
alter table public.builder_saved_sections enable row level security;
alter table public.products enable row level security;
alter table public.api_rate_limits enable row level security;

-- Public read: published polls
drop policy if exists "published polls are readable" on public.polls;
create policy "published polls are readable"
on public.polls
for select
to anon, authenticated
using (is_published = true);

drop policy if exists "published poll options are readable" on public.poll_options;
create policy "published poll options are readable"
on public.poll_options
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.polls
    where public.polls.id = public.poll_options.poll_id
      and public.polls.is_published = true
  )
);

drop policy if exists "responses are readable for published polls" on public.responses;
create policy "responses are readable for published polls"
on public.responses
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.polls
    where public.polls.id = public.responses.poll_id
      and public.polls.is_published = true
  )
);

drop policy if exists "anon can insert responses for published polls" on public.responses;
create policy "anon can insert responses for published polls"
on public.responses
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

drop policy if exists "published pages are readable" on public.pages;
create policy "published pages are readable"
on public.pages
for select
to anon, authenticated
using (is_published = true);
