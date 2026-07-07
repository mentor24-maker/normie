-- Rename poll category Scenario -> Scenarios (name + slug).

update public.player_profiles
set preferred_poll_categories = (
  select coalesce(
    jsonb_agg(
      case
        when elem.value = 'scenario' then 'scenarios'
        else elem.value
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements_text(preferred_poll_categories) as elem(value)
)
where jsonb_typeof(preferred_poll_categories) = 'array'
  and preferred_poll_categories ? 'scenario';

update public.player_profiles
set default_play_poll_category = 'scenarios'
where default_play_poll_category = 'scenario';

update public.gallery_media
set media_category = 'Scenarios'
where lower(trim(media_category)) in ('scenario', 'scenarios');

update public.poll_categories
set
  name = 'Scenarios',
  slug = 'scenarios',
  updated_at = now()
where slug = 'scenario'
   or lower(trim(name)) = 'scenario';
