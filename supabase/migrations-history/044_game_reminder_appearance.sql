-- Reminder presentation: speech bubble overlay or top/bottom strip.

alter table public.game_reminders
add column if not exists appearance text;

update public.game_reminders
set appearance = case
  when coalesce(display_type, 'popup') = 'inline' then 'strip'
  else 'speech_bubble'
end
where appearance is null or trim(appearance) = '';

alter table public.game_reminders
alter column appearance set default 'speech_bubble';

alter table public.game_reminders
alter column appearance set not null;

alter table public.game_reminders
drop constraint if exists game_reminders_appearance_check;

alter table public.game_reminders
add constraint game_reminders_appearance_check
check (appearance in ('speech_bubble', 'strip'));
