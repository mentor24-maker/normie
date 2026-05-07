create extension if not exists pgcrypto;

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  category varchar,
  question text not null,
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

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'editor' check (role in ('owner', 'admin', 'editor', 'viewer')),
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists responses_poll_id_idx on public.responses (poll_id);
create index if not exists responses_session_id_idx on public.responses (session_id);
create index if not exists poll_options_poll_id_idx on public.poll_options (poll_id);
create index if not exists page_templates_updated_at_idx on public.page_templates (updated_at desc);
create index if not exists pages_updated_at_idx on public.pages (updated_at desc);
create index if not exists pages_slug_idx on public.pages (slug);
create index if not exists users_role_idx on public.users (role);

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.responses enable row level security;
alter table public.page_templates enable row level security;
alter table public.pages enable row level security;
alter table public.users enable row level security;

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

drop policy if exists "published pages are readable" on public.pages;
create policy "published pages are readable"
on public.pages
for select
to anon, authenticated
using (is_published = true);
