create table if not exists public.player_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  handle text not null,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (handle)
);

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

grant select, insert, update on public.player_profiles to anon, authenticated, service_role;
grant select, insert, update on public.responses to anon, authenticated, service_role;

notify pgrst, 'reload schema';
