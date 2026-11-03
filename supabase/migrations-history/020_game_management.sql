-- Game management foundations: level/tier progression and point rewards.

create table if not exists public.game_level_tiers (
  id uuid primary key default gen_random_uuid(),
  level integer not null check (level > 0),
  tier text not null,
  name text not null,
  points_required integer not null default 0 check (points_required >= 0),
  sort_order integer not null default 0,
  perks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (level, tier)
);

create table if not exists public.game_rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  reward_type text not null default 'custom' check (reward_type in ('badge', 'digital', 'access', 'merch', 'token', 'custom')),
  points_cost integer not null default 0 check (points_cost >= 0),
  inventory_count integer check (inventory_count is null or inventory_count >= 0),
  status text not null default 'draft' check (status in ('active', 'draft', 'archived')),
  image_url text not null default '',
  redemption_url text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_level_tiers_level_sort_idx
on public.game_level_tiers (level, sort_order);

create index if not exists game_level_tiers_points_required_idx
on public.game_level_tiers (points_required);

create index if not exists game_rewards_status_points_idx
on public.game_rewards (status, points_cost);

create index if not exists game_rewards_updated_at_idx
on public.game_rewards (updated_at desc);

alter table public.game_level_tiers enable row level security;
alter table public.game_rewards enable row level security;

drop policy if exists "game level tiers are readable" on public.game_level_tiers;
create policy "game level tiers are readable"
on public.game_level_tiers
for select
to anon, authenticated
using (true);

drop policy if exists "active game rewards are readable" on public.game_rewards;
create policy "active game rewards are readable"
on public.game_rewards
for select
to anon, authenticated
using (status = 'active');

grant select on public.game_level_tiers to anon, authenticated, service_role;
grant select on public.game_rewards to anon, authenticated, service_role;
grant insert, update, delete on public.game_level_tiers to service_role;
grant insert, update, delete on public.game_rewards to service_role;

insert into public.game_level_tiers (level, tier, name, points_required, sort_order, perks)
values
  (1, 'Bronze', 'First Signal', 0, 10, '["Start earning points from poll answers"]'::jsonb),
  (1, 'Silver', 'Pattern Spotter', 25, 20, '["Unlock early engagement experiments"]'::jsonb),
  (1, 'Gold', 'Culture Mapper', 100, 30, '["Qualify for featured reward drops"]'::jsonb)
on conflict (level, tier) do nothing;

notify pgrst, 'reload schema';
