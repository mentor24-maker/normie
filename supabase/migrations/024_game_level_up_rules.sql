-- Level-up graduation rules keyed to configured scoring criteria.

create table if not exists public.game_level_up_rules (
  id uuid primary key default gen_random_uuid(),
  level_name text not null check (level_name in ('Grades', 'Rank', 'Classes', 'Stage', 'Phase', 'Degrees', 'Plane', 'Echelons', 'Tiers')),
  sublevel_name text not null,
  criteria jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_level_up_rules_target_idx
on public.game_level_up_rules (level_name, sublevel_name);

create index if not exists game_level_up_rules_updated_at_idx
on public.game_level_up_rules (updated_at desc);

alter table public.game_level_up_rules enable row level security;

drop policy if exists "game level up rules are readable" on public.game_level_up_rules;
create policy "game level up rules are readable"
on public.game_level_up_rules
for select
to anon, authenticated
using (true);

grant select on public.game_level_up_rules to anon, authenticated, service_role;
grant insert, update, delete on public.game_level_up_rules to service_role;

notify pgrst, 'reload schema';
