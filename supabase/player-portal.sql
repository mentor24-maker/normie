-- Player Portal schema (idempotent — safe to run in Supabase SQL Editor)
-- Split across numbered migrations as:
--   supabase/migrations/005_player_portal.sql
--   supabase/migrations/013_player_profile_details.sql

-- ---------------------------------------------------------------------------
-- player_profiles
-- ---------------------------------------------------------------------------
create table if not exists public.player_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  handle text not null,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (handle)
);

-- Profile page fields (migration 013)
alter table public.player_profiles
add column if not exists avatar_url text,
add column if not exists bio text not null default '',
add column if not exists social_links jsonb not null default '{}'::jsonb,
add column if not exists share_profile boolean not null default false,
add column if not exists share_poll_responses boolean not null default false;

-- Preferences (migration 014)
alter table public.player_profiles
add column if not exists preferred_poll_categories jsonb not null default '[]'::jsonb,
add column if not exists default_play_poll_category text;

create index if not exists player_profiles_status_idx on public.player_profiles (status);
create index if not exists player_profiles_handle_idx on public.player_profiles (handle);

alter table public.player_profiles enable row level security;

drop policy if exists "active player profiles are readable" on public.player_profiles;
create policy "active player profiles are readable"
on public.player_profiles
for select
to anon, authenticated
using (status = 'active');

drop policy if exists "players can read own profile" on public.player_profiles;
create policy "players can read own profile"
on public.player_profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "players can update own profile" on public.player_profiles;
create policy "players can update own profile"
on public.player_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

grant select, insert, update on public.player_profiles to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Link poll responses to authenticated players
-- ---------------------------------------------------------------------------
alter table public.responses
add column if not exists user_id uuid;

alter table public.responses
add column if not exists tokens_earned integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'responses_user_id_fkey'
  ) then
    alter table public.responses
    add constraint responses_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete set null;
  end if;
end $$;

create index if not exists responses_user_id_idx on public.responses (user_id);

create unique index if not exists responses_user_poll_unique_idx
on public.responses (user_id, poll_id)
where user_id is not null;

grant select, insert, update on public.responses to anon, authenticated, service_role;

notify pgrst, 'reload schema';
