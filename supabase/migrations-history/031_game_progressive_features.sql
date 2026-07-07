alter table if exists public.game_rewards
drop constraint if exists game_rewards_reward_type_check;

alter table if exists public.game_rewards
add constraint game_rewards_reward_type_check
check (reward_type in ('badge', 'digital', 'access', 'feature', 'merch', 'token', 'custom'));

create table if not exists public.game_progressive_features (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null unique,
  name text not null,
  description text not null default '',
  unlock_level_name text not null check (unlock_level_name in ('Levels', 'Grades', 'Classes', 'Stage', 'Phase', 'Degrees', 'Plane', 'Echelons', 'Tiers')),
  unlock_sublevel_name text not null default '',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_progressive_features_unlock_idx
on public.game_progressive_features (unlock_level_name, unlock_sublevel_name);

create index if not exists game_progressive_features_updated_at_idx
on public.game_progressive_features (updated_at desc);

alter table public.game_progressive_features enable row level security;

drop policy if exists "game progressive features are readable" on public.game_progressive_features;
create policy "game progressive features are readable"
on public.game_progressive_features
for select
to anon, authenticated
using (true);

grant select on public.game_progressive_features to anon, authenticated, service_role;
grant insert, update, delete on public.game_progressive_features to service_role;

insert into public.game_progressive_features (feature_key, name, description, unlock_level_name, unlock_sublevel_name, is_active, metadata)
values
  (
    'poll_skip',
    'Skip Poll',
    'Allows qualified players to skip the current poll and move to the next one.',
    'Levels',
    '1',
    true,
    '{"uiPlacement":"under_poll_options"}'::jsonb
  )
on conflict (feature_key) do nothing;
