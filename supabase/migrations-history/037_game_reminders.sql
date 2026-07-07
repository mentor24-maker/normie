-- Player reminders: popup or inline notices triggered by game criteria.

create table if not exists public.game_reminders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_type text not null default 'popup' check (display_type in ('popup', 'inline')),
  message_html text not null default '',
  criterion_type text not null check (criterion_type in ('polls_taken', 'logins', 'specific_poll', 'registered')),
  criterion_value jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_reminders_active_sort_idx
on public.game_reminders (is_active, sort_order);

create index if not exists game_reminders_updated_at_idx
on public.game_reminders (updated_at desc);

alter table public.game_reminders enable row level security;

drop policy if exists "game reminders are readable" on public.game_reminders;
create policy "game reminders are readable"
on public.game_reminders
for select
to anon, authenticated
using (true);

grant select on public.game_reminders to anon, authenticated, service_role;
grant insert, update, delete on public.game_reminders to service_role;
