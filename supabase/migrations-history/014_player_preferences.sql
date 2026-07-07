alter table public.player_profiles
add column if not exists preferred_poll_categories jsonb not null default '[]'::jsonb,
add column if not exists default_play_poll_category text;

notify pgrst, 'reload schema';
