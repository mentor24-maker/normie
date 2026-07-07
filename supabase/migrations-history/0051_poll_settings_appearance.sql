-- Poll settings table + appearance columns (safe if 004 was never applied).

create table if not exists public.poll_settings (
  id text primary key default 'default' check (id = 'default'),
  previous_results_empty_eyebrow text not null default 'How It Works',
  previous_results_empty_content_html text not null default '',
  pod_background_color text not null default 'transparent',
  header_background_color text not null default '#5acff9',
  header_font_color text not null default '#0c5f72',
  header_font_size text not null default '1.08',
  header_border_size text not null default '0',
  header_border_color text not null default 'transparent',
  header_drop_shadow_enabled text not null default 'false',
  header_drop_shadow_x text not null default '0',
  header_drop_shadow_y text not null default '12',
  header_drop_shadow_blur text not null default '30',
  header_drop_shadow_color text not null default '#322217',
  header_drop_shadow_opacity text not null default '8',
  question_area_width text not null default '100',
  answer_button_a_background text not null default '#ffffff',
  answer_button_b_background text not null default '#ffffff',
  answer_button_a_border_size text not null default '1',
  answer_button_b_border_size text not null default '1',
  answer_button_a_border_color text not null default '#091018',
  answer_button_b_border_color text not null default '#091018',
  answer_button_a_font_color text not null default '#091018',
  answer_button_b_font_color text not null default '#091018',
  updated_at timestamptz not null default now()
);

alter table public.poll_settings
  add column if not exists previous_results_empty_eyebrow text not null default 'How It Works',
  add column if not exists previous_results_empty_content_html text not null default '',
  add column if not exists pod_background_color text not null default 'transparent',
  add column if not exists header_background_color text not null default '#5acff9',
  add column if not exists header_font_color text not null default '#0c5f72',
  add column if not exists header_font_size text not null default '1.08',
  add column if not exists header_border_size text not null default '0',
  add column if not exists header_border_color text not null default 'transparent',
  add column if not exists header_drop_shadow_enabled text not null default 'false',
  add column if not exists header_drop_shadow_x text not null default '0',
  add column if not exists header_drop_shadow_y text not null default '12',
  add column if not exists header_drop_shadow_blur text not null default '30',
  add column if not exists header_drop_shadow_color text not null default '#322217',
  add column if not exists header_drop_shadow_opacity text not null default '8',
  add column if not exists question_area_width text not null default '100',
  add column if not exists answer_button_a_background text not null default '#ffffff',
  add column if not exists answer_button_b_background text not null default '#ffffff',
  add column if not exists answer_button_a_border_size text not null default '1',
  add column if not exists answer_button_b_border_size text not null default '1',
  add column if not exists answer_button_a_border_color text not null default '#091018',
  add column if not exists answer_button_b_border_color text not null default '#091018',
  add column if not exists answer_button_a_font_color text not null default '#091018',
  add column if not exists answer_button_b_font_color text not null default '#091018',
  add column if not exists updated_at timestamptz not null default now();

insert into public.poll_settings (
  id,
  previous_results_empty_eyebrow,
  previous_results_empty_content_html,
  pod_background_color,
  header_background_color,
  header_font_color,
  header_font_size
)
values (
  'default',
  'How It Works',
  '<h2>Vote left, watch the story unfold on the right.</h2><p>Each screen invites you into the next question while showing the community response to the previous prompt.</p>',
  'transparent',
  '#5acff9',
  '#0c5f72',
  '1.08'
)
on conflict (id) do nothing;

update public.poll_settings
set
  pod_background_color = coalesce(nullif(pod_background_color, ''), 'transparent'),
  header_background_color = coalesce(nullif(header_background_color, ''), '#5acff9'),
  header_font_color = coalesce(nullif(header_font_color, ''), '#0c5f72'),
  header_font_size = coalesce(nullif(header_font_size, ''), '1.08'),
  header_border_size = coalesce(nullif(header_border_size, ''), '0'),
  header_border_color = coalesce(nullif(header_border_color, ''), 'transparent'),
  header_drop_shadow_enabled = coalesce(nullif(header_drop_shadow_enabled, ''), 'false'),
  header_drop_shadow_x = coalesce(nullif(header_drop_shadow_x, ''), '0'),
  header_drop_shadow_y = coalesce(nullif(header_drop_shadow_y, ''), '12'),
  header_drop_shadow_blur = coalesce(nullif(header_drop_shadow_blur, ''), '30'),
  header_drop_shadow_color = coalesce(nullif(header_drop_shadow_color, ''), '#322217'),
  header_drop_shadow_opacity = coalesce(nullif(header_drop_shadow_opacity, ''), '8'),
  question_area_width = coalesce(nullif(question_area_width, ''), '100'),
  answer_button_a_background = coalesce(nullif(answer_button_a_background, ''), '#ffffff'),
  answer_button_b_background = coalesce(nullif(answer_button_b_background, ''), '#ffffff'),
  answer_button_a_border_size = coalesce(nullif(answer_button_a_border_size, ''), '1'),
  answer_button_b_border_size = coalesce(nullif(answer_button_b_border_size, ''), '1'),
  answer_button_a_border_color = coalesce(nullif(answer_button_a_border_color, ''), '#091018'),
  answer_button_b_border_color = coalesce(nullif(answer_button_b_border_color, ''), '#091018'),
  answer_button_a_font_color = coalesce(nullif(answer_button_a_font_color, ''), '#091018'),
  answer_button_b_font_color = coalesce(nullif(answer_button_b_font_color, ''), '#091018')
where id = 'default';

-- Refresh PostgREST schema cache (Supabase API) after column changes.
notify pgrst, 'reload schema';

alter table public.poll_settings enable row level security;

drop policy if exists "poll settings are readable" on public.poll_settings;
create policy "poll settings are readable"
on public.poll_settings
for select
to anon, authenticated
using (true);
