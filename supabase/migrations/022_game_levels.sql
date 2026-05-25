-- Game level systems: configurable progression names and nested level labels.

create table if not exists public.game_levels (
  id uuid primary key default gen_random_uuid(),
  level_name text not null check (level_name in ('Grades', 'Rank', 'Classes', 'Stage', 'Phase', 'Degrees', 'Plane', 'Echelons')),
  level_order integer not null check (level_order between 1 and 10),
  game_level_levels jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (level_order)
);

create index if not exists game_levels_level_name_idx
on public.game_levels (level_name);

create index if not exists game_levels_updated_at_idx
on public.game_levels (updated_at desc);

alter table public.game_levels enable row level security;

drop policy if exists "game levels are readable" on public.game_levels;
create policy "game levels are readable"
on public.game_levels
for select
to anon, authenticated
using (true);

grant select on public.game_levels to anon, authenticated, service_role;
grant insert, update, delete on public.game_levels to service_role;

insert into public.game_levels (level_name, level_order, game_level_levels)
values ('Rank', 1, '["Apprentice", "Acolyte", "Wizard"]'::jsonb)
on conflict (level_order) do nothing;

notify pgrst, 'reload schema';

