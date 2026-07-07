-- Replace the progression option "Rank" with "Levels".

alter table if exists public.game_levels
drop constraint if exists game_levels_level_name_check;

update public.game_levels
set level_name = 'Levels',
    updated_at = now()
where level_name = 'Rank';

alter table if exists public.game_levels
add constraint game_levels_level_name_check
check (level_name in ('Levels', 'Grades', 'Classes', 'Stage', 'Phase', 'Degrees', 'Plane', 'Echelons', 'Tiers'));

alter table if exists public.game_level_up_rules
drop constraint if exists game_level_up_rules_level_name_check;

update public.game_level_up_rules
set level_name = 'Levels',
    updated_at = now()
where level_name = 'Rank';

alter table if exists public.game_level_up_rules
add constraint game_level_up_rules_level_name_check
check (level_name in ('Levels', 'Grades', 'Classes', 'Stage', 'Phase', 'Degrees', 'Plane', 'Echelons', 'Tiers'));

notify pgrst, 'reload schema';
