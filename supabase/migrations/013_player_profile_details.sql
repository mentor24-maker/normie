alter table public.player_profiles
add column if not exists avatar_url text,
add column if not exists bio text not null default '',
add column if not exists social_links jsonb not null default '{}'::jsonb,
add column if not exists share_profile boolean not null default false,
add column if not exists share_poll_responses boolean not null default false;

drop policy if exists "players can update own profile" on public.player_profiles;
create policy "players can update own profile"
on public.player_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

notify pgrst, 'reload schema';
