-- Per-poll rich-text deep dive shown in the Previous Results module overlay.

alter table public.polls
  add column if not exists deep_dive text not null default '';
