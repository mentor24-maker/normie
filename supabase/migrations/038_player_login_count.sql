-- Track player login count for game reminder criteria.

alter table public.player_profiles
add column if not exists login_count integer not null default 0 check (login_count >= 0);

create index if not exists player_profiles_login_count_idx
on public.player_profiles (login_count);
