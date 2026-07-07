-- Game scoring rules: define each way a player can earn points.

create table if not exists public.game_scoring (
  id uuid primary key default gen_random_uuid(),
  score_name text not null,
  description text not null default '',
  specific_criteria text not null default '',
  points integer not null default 0 check (points >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_scoring_points_idx
on public.game_scoring (points);

create index if not exists game_scoring_updated_at_idx
on public.game_scoring (updated_at desc);

alter table public.game_scoring enable row level security;

drop policy if exists "game scoring rules are readable" on public.game_scoring;
create policy "game scoring rules are readable"
on public.game_scoring
for select
to anon, authenticated
using (true);

grant select on public.game_scoring to anon, authenticated, service_role;
grant insert, update, delete on public.game_scoring to service_role;

insert into public.game_scoring (score_name, description, specific_criteria, points)
values
  ('Poll answer', 'Awarded when a signed-in player answers a poll.', 'Player must submit one valid answer to a published poll they have not already answered.', 1)
on conflict do nothing;

notify pgrst, 'reload schema';

