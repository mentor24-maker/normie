-- Poll header, question area, and answer button appearance.

alter table public.poll_settings
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
  add column if not exists answer_button_b_font_color text not null default '#091018';

update public.poll_settings
set
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

notify pgrst, 'reload schema';
