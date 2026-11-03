-- Poll system settings (singleton row).

create table if not exists public.poll_settings (
  id text primary key default 'default' check (id = 'default'),
  previous_results_empty_eyebrow text not null default 'How It Works',
  previous_results_empty_content_html text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.poll_settings (id, previous_results_empty_eyebrow, previous_results_empty_content_html)
values (
  'default',
  'How It Works',
  '<h2>Vote left, watch the story unfold on the right.</h2><p>Each screen invites you into the next question while showing the community response to the previous prompt.</p>'
)
on conflict (id) do nothing;

alter table public.poll_settings enable row level security;

drop policy if exists "poll settings are readable" on public.poll_settings;
create policy "poll settings are readable"
on public.poll_settings
for select
to anon, authenticated
using (true);
