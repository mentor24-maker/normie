-- Audience controls where game events and reminders may fire (public site, portal, or both).

alter table if exists public.game_level_events
add column if not exists audience text not null default 'both';

alter table if exists public.game_level_events
drop constraint if exists game_level_events_audience_check;

alter table if exists public.game_level_events
add constraint game_level_events_audience_check
check (audience in ('public', 'portal', 'both'));

alter table if exists public.game_reminders
add column if not exists audience text not null default 'both';

alter table if exists public.game_reminders
drop constraint if exists game_reminders_audience_check;

alter table if exists public.game_reminders
add constraint game_reminders_audience_check
check (audience in ('public', 'portal', 'both'));
