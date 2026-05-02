create extension if not exists pgcrypto;

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
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

create index if not exists responses_poll_id_idx on public.responses (poll_id);
create index if not exists responses_session_id_idx on public.responses (session_id);
create index if not exists poll_options_poll_id_idx on public.poll_options (poll_id);

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.responses enable row level security;

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
