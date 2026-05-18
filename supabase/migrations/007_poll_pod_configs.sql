-- Poll settings: full table + pod_configs JSON (safe if earlier migrations were skipped).

create table if not exists public.poll_settings (
  id text primary key default 'default' check (id = 'default'),
  previous_results_empty_eyebrow text not null default 'How It Works',
  previous_results_empty_content_html text not null default '',
  pod_background_color text not null default 'transparent',
  header_background_color text not null default '#5acff9',
  header_font_color text not null default '#0c5f72',
  header_font_size text not null default '1.08',
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
  add column if not exists answer_button_a_font_size text not null default '1',
  add column if not exists answer_button_b_font_size text not null default '1',
  add column if not exists pod_configs jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

insert into public.poll_settings (id)
values ('default')
on conflict (id) do nothing;

update public.poll_settings
set pod_configs = jsonb_build_object(
  'polls',
  jsonb_build_object(
    'layout',
    jsonb_build_object(
      'podBackgroundMode', 'none',
      'podBackgroundColor', coalesce(pod_background_color, 'transparent'),
      'podGradientColor1', '#ffffff',
      'podGradientColor2', '#eaf4ff',
      'contentWidth', coalesce(question_area_width, '100'),
      'headerBackgroundColor', coalesce(header_background_color, '#5acff9'),
      'headerFontColor', coalesce(header_font_color, '#0c5f72'),
      'headerFontSize', coalesce(header_font_size, '1.08'),
      'podBorderRadius', '34',
      'headerBorderRadius', '999',
      'headerBorderSize', coalesce(header_border_size, '0'),
      'headerBorderColor', coalesce(header_border_color, 'transparent'),
      'headerDropShadowEnabled', coalesce(header_drop_shadow_enabled, 'false'),
      'headerDropShadowX', coalesce(header_drop_shadow_x, '0'),
      'headerDropShadowY', coalesce(header_drop_shadow_y, '12'),
      'headerDropShadowBlur', coalesce(header_drop_shadow_blur, '30'),
      'headerDropShadowColor', coalesce(header_drop_shadow_color, '#322217'),
      'headerDropShadowOpacity', coalesce(header_drop_shadow_opacity, '8'),
      'backgroundImageUrl', '',
      'backgroundImageFocus', 'right'
    ),
    'answerButtons',
    jsonb_build_object(
      'answerButtonABackground', coalesce(answer_button_a_background, '#ffffff'),
      'answerButtonBBackground', coalesce(answer_button_b_background, '#ffffff'),
      'answerButtonABorderSize', coalesce(answer_button_a_border_size, '1'),
      'answerButtonBBorderSize', coalesce(answer_button_b_border_size, '1'),
      'answerButtonABorderColor', coalesce(answer_button_a_border_color, '#091018'),
      'answerButtonBBorderColor', coalesce(answer_button_b_border_color, '#091018'),
      'answerButtonAFontColor', coalesce(answer_button_a_font_color, '#091018'),
      'answerButtonBFontColor', coalesce(answer_button_b_font_color, '#091018'),
      'answerButtonAFontSize', coalesce(answer_button_a_font_size, '1'),
      'answerButtonBFontSize', coalesce(answer_button_b_font_size, '1')
    )
  ),
  'previous_results',
  jsonb_build_object(
    'layout',
    jsonb_build_object(
      'podBackgroundMode', 'none',
      'podBackgroundColor', coalesce(pod_background_color, 'transparent'),
      'podGradientColor1', '#ffffff',
      'podGradientColor2', '#eaf4ff',
      'contentWidth', coalesce(question_area_width, '100'),
      'headerBackgroundColor', coalesce(header_background_color, '#5acff9'),
      'headerFontColor', coalesce(header_font_color, '#0c5f72'),
      'headerFontSize', coalesce(header_font_size, '1.08'),
      'podBorderRadius', '34',
      'headerBorderRadius', '999',
      'headerBorderSize', coalesce(header_border_size, '0'),
      'headerBorderColor', coalesce(header_border_color, 'transparent'),
      'headerDropShadowEnabled', coalesce(header_drop_shadow_enabled, 'false'),
      'headerDropShadowX', coalesce(header_drop_shadow_x, '0'),
      'headerDropShadowY', coalesce(header_drop_shadow_y, '12'),
      'headerDropShadowBlur', coalesce(header_drop_shadow_blur, '30'),
      'headerDropShadowColor', coalesce(header_drop_shadow_color, '#322217'),
      'headerDropShadowOpacity', coalesce(header_drop_shadow_opacity, '8'),
      'backgroundImageUrl', '',
      'backgroundImageFocus', 'right'
    )
  ),
  'initial_page',
  jsonb_build_object(
    'layout',
    jsonb_build_object(
      'podBackgroundMode', 'none',
      'podBackgroundColor', coalesce(pod_background_color, 'transparent'),
      'podGradientColor1', '#ffffff',
      'podGradientColor2', '#eaf4ff',
      'contentWidth', coalesce(question_area_width, '100'),
      'headerBackgroundColor', coalesce(header_background_color, '#5acff9'),
      'headerFontColor', coalesce(header_font_color, '#0c5f72'),
      'headerFontSize', coalesce(header_font_size, '1.08'),
      'podBorderRadius', '34',
      'headerBorderRadius', '999',
      'headerBorderSize', coalesce(header_border_size, '0'),
      'headerBorderColor', coalesce(header_border_color, 'transparent'),
      'headerDropShadowEnabled', coalesce(header_drop_shadow_enabled, 'false'),
      'headerDropShadowX', coalesce(header_drop_shadow_x, '0'),
      'headerDropShadowY', coalesce(header_drop_shadow_y, '12'),
      'headerDropShadowBlur', coalesce(header_drop_shadow_blur, '30'),
      'headerDropShadowColor', coalesce(header_drop_shadow_color, '#322217'),
      'headerDropShadowOpacity', coalesce(header_drop_shadow_opacity, '8'),
      'backgroundImageUrl', '',
      'backgroundImageFocus', 'right'
    ),
    'content',
    jsonb_build_object(
      'headerLabel', '',
      'contentHtml',
      coalesce(
        previous_results_empty_content_html,
        '<h2>Vote left, watch the story unfold on the right.</h2><p>Each screen invites you into the next question while showing the community response to the previous prompt.</p>'
      )
    )
  ),
  'interstitial',
  jsonb_build_object(
    'layout',
    jsonb_build_object(
      'podBackgroundMode', 'none',
      'podBackgroundColor', 'transparent',
      'podGradientColor1', '#ffffff',
      'podGradientColor2', '#eaf4ff',
      'contentWidth', '100',
      'headerBackgroundColor', '#5acff9',
      'headerFontColor', '#0c5f72',
      'headerFontSize', '1.08',
      'podBorderRadius', '34',
      'headerBorderRadius', '999',
      'headerBorderSize', '0',
      'headerBorderColor', 'transparent',
      'headerDropShadowEnabled', 'false',
      'headerDropShadowX', '0',
      'headerDropShadowY', '12',
      'headerDropShadowBlur', '30',
      'headerDropShadowColor', '#322217',
      'headerDropShadowOpacity', '8',
      'backgroundImageUrl', '',
      'backgroundImageFocus', 'right'
    ),
    'content',
    jsonb_build_object(
      'headerLabel', 'Announcement',
      'contentHtml', '<p>Interstitial message copy goes here.</p>'
    )
  )
)
where id = 'default'
  and (pod_configs is null or pod_configs = '{}'::jsonb);

alter table public.poll_settings enable row level security;

drop policy if exists "poll settings are readable" on public.poll_settings;
create policy "poll settings are readable"
on public.poll_settings
for select
to anon, authenticated
using (true);

notify pgrst, 'reload schema';
