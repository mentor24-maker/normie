create table if not exists public.game_level_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  level_name text not null check (level_name in ('Levels', 'Grades', 'Classes', 'Stage', 'Phase', 'Degrees', 'Plane', 'Echelons', 'Tiers')),
  sublevel_name text not null default '',
  module_id uuid references public.builder_cell_modules(id) on delete set null,
  trigger text not null default 'game' check (trigger in ('game')),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_level_events_target_idx
on public.game_level_events (level_name, sublevel_name);

create index if not exists game_level_events_module_idx
on public.game_level_events (module_id);

create index if not exists game_level_events_updated_at_idx
on public.game_level_events (updated_at desc);

alter table public.game_level_events enable row level security;

drop policy if exists "game level events are readable" on public.game_level_events;
create policy "game level events are readable"
on public.game_level_events
for select
to anon, authenticated
using (true);

grant select on public.game_level_events to anon, authenticated, service_role;
grant insert, update, delete on public.game_level_events to service_role;

insert into public.game_level_events (event_name, level_name, sublevel_name, module_id, trigger, is_active, metadata)
select
  'Level 1.1 Confetti',
  'Levels',
  '1',
  candidate.id,
  'game',
  true,
  '{"eventType":"confetti"}'::jsonb
from (
  select builder_cell_modules.id
  from public.builder_cell_modules
  where exists (
    select 1
    from jsonb_array_elements(builder_cell_modules.modules) as module
    where module->>'type' = 'confetti'
      and coalesce(module->'settings'->>'trigger', '') = 'game'
  )
  order by builder_cell_modules.updated_at desc
  limit 1
) as candidate
where not exists (
  select 1 from public.game_level_events where event_name = 'Level 1.1 Confetti'
);
