-- Normalize game level track names from plural to singular.
-- IMPORTANT: relax constraints first so row updates do not fail.

alter table if exists public.game_levels
drop constraint if exists game_levels_level_name_check;

alter table if exists public.game_levels
add constraint game_levels_level_name_check
check (level_name in ('Levels', 'Grades', 'Classes', 'Stage', 'Phase', 'Degrees', 'Plane', 'Echelons', 'Tiers', 'Level', 'Grade', 'Class', 'Degree', 'Echelon', 'Tier'));

alter table if exists public.game_level_up_rules
drop constraint if exists game_level_up_rules_level_name_check;

alter table if exists public.game_level_up_rules
add constraint game_level_up_rules_level_name_check
check (level_name in ('Levels', 'Grades', 'Classes', 'Stage', 'Phase', 'Degrees', 'Plane', 'Echelons', 'Tiers', 'Level', 'Grade', 'Class', 'Degree', 'Echelon', 'Tier'));

alter table if exists public.game_progressive_features
drop constraint if exists game_progressive_features_unlock_level_name_check;

alter table if exists public.game_progressive_features
add constraint game_progressive_features_unlock_level_name_check
check (unlock_level_name in ('Levels', 'Grades', 'Classes', 'Stage', 'Phase', 'Degrees', 'Plane', 'Echelons', 'Tiers', 'Level', 'Grade', 'Class', 'Degree', 'Echelon', 'Tier'));

alter table if exists public.game_level_events
drop constraint if exists game_level_events_level_name_check;

alter table if exists public.game_level_events
add constraint game_level_events_level_name_check
check (level_name in ('Levels', 'Grades', 'Classes', 'Stage', 'Phase', 'Degrees', 'Plane', 'Echelons', 'Tiers', 'Level', 'Grade', 'Class', 'Degree', 'Echelon', 'Tier'));

-- Migrate persisted level names in core game tables.
update public.game_levels
set level_name = case level_name
  when 'Levels' then 'Level'
  when 'Grades' then 'Grade'
  when 'Classes' then 'Class'
  when 'Degrees' then 'Degree'
  when 'Echelons' then 'Echelon'
  when 'Tiers' then 'Tier'
  else level_name
end,
updated_at = now()
where level_name in ('Levels', 'Grades', 'Classes', 'Degrees', 'Echelons', 'Tiers');

update public.game_level_up_rules
set level_name = case level_name
  when 'Levels' then 'Level'
  when 'Grades' then 'Grade'
  when 'Classes' then 'Class'
  when 'Degrees' then 'Degree'
  when 'Echelons' then 'Echelon'
  when 'Tiers' then 'Tier'
  else level_name
end,
updated_at = now()
where level_name in ('Levels', 'Grades', 'Classes', 'Degrees', 'Echelons', 'Tiers');

update public.game_progressive_features
set unlock_level_name = case unlock_level_name
  when 'Levels' then 'Level'
  when 'Grades' then 'Grade'
  when 'Classes' then 'Class'
  when 'Degrees' then 'Degree'
  when 'Echelons' then 'Echelon'
  when 'Tiers' then 'Tier'
  else unlock_level_name
end,
updated_at = now()
where unlock_level_name in ('Levels', 'Grades', 'Classes', 'Degrees', 'Echelons', 'Tiers');

update public.game_level_events
set level_name = case level_name
  when 'Levels' then 'Level'
  when 'Grades' then 'Grade'
  when 'Classes' then 'Class'
  when 'Degrees' then 'Degree'
  when 'Echelons' then 'Echelon'
  when 'Tiers' then 'Tier'
  else level_name
end,
updated_at = now()
where level_name in ('Levels', 'Grades', 'Classes', 'Degrees', 'Echelons', 'Tiers');

-- Migrate reward metadata references used by progression reward tracks.
update public.game_rewards
set metadata = jsonb_set(
  metadata,
  '{achievementLevelName}',
  to_jsonb(
    case metadata ->> 'achievementLevelName'
      when 'Levels' then 'Level'
      when 'Grades' then 'Grade'
      when 'Classes' then 'Class'
      when 'Degrees' then 'Degree'
      when 'Echelons' then 'Echelon'
      when 'Tiers' then 'Tier'
      else metadata ->> 'achievementLevelName'
    end
  ),
  true
),
updated_at = now()
where metadata ? 'achievementLevelName'
  and metadata ->> 'achievementLevelName' in ('Levels', 'Grades', 'Classes', 'Degrees', 'Echelons', 'Tiers');

-- Tighten check constraints to singular canonical values.
alter table if exists public.game_levels
drop constraint if exists game_levels_level_name_check;

alter table if exists public.game_levels
add constraint game_levels_level_name_check
check (level_name in ('Level', 'Grade', 'Class', 'Stage', 'Phase', 'Degree', 'Plane', 'Echelon', 'Tier'));

alter table if exists public.game_level_up_rules
drop constraint if exists game_level_up_rules_level_name_check;

alter table if exists public.game_level_up_rules
add constraint game_level_up_rules_level_name_check
check (level_name in ('Level', 'Grade', 'Class', 'Stage', 'Phase', 'Degree', 'Plane', 'Echelon', 'Tier'));

alter table if exists public.game_progressive_features
drop constraint if exists game_progressive_features_unlock_level_name_check;

alter table if exists public.game_progressive_features
add constraint game_progressive_features_unlock_level_name_check
check (unlock_level_name in ('Level', 'Grade', 'Class', 'Stage', 'Phase', 'Degree', 'Plane', 'Echelon', 'Tier'));

alter table if exists public.game_level_events
drop constraint if exists game_level_events_level_name_check;

alter table if exists public.game_level_events
add constraint game_level_events_level_name_check
check (level_name in ('Level', 'Grade', 'Class', 'Stage', 'Phase', 'Degree', 'Plane', 'Echelon', 'Tier'));
