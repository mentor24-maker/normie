-- Answer button font size (rem) for poll settings.

alter table public.poll_settings
  add column if not exists answer_button_a_font_size text not null default '1',
  add column if not exists answer_button_b_font_size text not null default '1';

update public.poll_settings
set
  answer_button_a_font_size = coalesce(nullif(answer_button_a_font_size, ''), '1'),
  answer_button_b_font_size = coalesce(nullif(answer_button_b_font_size, ''), '1'),
  pod_configs = jsonb_set(
    jsonb_set(
      pod_configs,
      '{polls,answerButtons,answerButtonAFontSize}',
      to_jsonb(coalesce(nullif(answer_button_a_font_size, ''), '1')),
      true
    ),
    '{polls,answerButtons,answerButtonBFontSize}',
    to_jsonb(coalesce(nullif(answer_button_b_font_size, ''), '1')),
    true
  )
where id = 'default'
  and pod_configs is not null
  and pod_configs <> '{}'::jsonb;

notify pgrst, 'reload schema';
