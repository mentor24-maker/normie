-- Add Tiers as a configurable level name and allow explicit reordering.

alter table public.game_levels
drop constraint if exists game_levels_level_name_check;

alter table public.game_levels
add constraint game_levels_level_name_check
check (level_name in ('Levels', 'Grades', 'Classes', 'Stage', 'Phase', 'Degrees', 'Plane', 'Echelons', 'Tiers'));

alter table public.game_levels
drop constraint if exists game_levels_level_order_key;

notify pgrst, 'reload schema';
