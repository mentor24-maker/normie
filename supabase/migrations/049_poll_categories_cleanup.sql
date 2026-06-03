-- Merge legacy "-and-" slug variants and normalize imported category display names.

create or replace function public.slugify_poll_category_label(value text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    regexp_replace(
      regexp_replace(lower(trim(coalesce(value, ''))), '&', '', 'g'),
      '[^a-z0-9]+',
      '-',
      'g'
    ),
    '(^-+|-+$)',
    '',
    'g'
  );
$$;

create or replace function public.format_poll_category_name(value text)
returns text
language sql
immutable
as $$
  select case
    when trim(coalesce(value, '')) = '' then ''
    when trim(value) ~ '^[a-z0-9/-]+$' and trim(value) ~ '-' then
      initcap(replace(replace(trim(value), '-', ' '), '/', ' '))
    else initcap(
      trim(
        regexp_replace(
          regexp_replace(
            regexp_replace(lower(trim(value)), '&', ' and ', 'g'),
            '[^a-z0-9]+',
            ' ',
            'g'
          ),
          '\s+',
          ' ',
          'g'
        )
      )
    )
  end;
$$;

create temporary table poll_category_slug_merges (
  source_slug text primary key,
  target_slug text not null
) on commit drop;

insert into poll_category_slug_merges (source_slug, target_slug)
select source.slug, target.slug
from public.poll_categories source
join public.poll_categories target
  on target.slug = replace(source.slug, '-and-', '-')
 and source.slug like '%-and-%'
 and source.id <> target.id;

do $$
declare
  merge_row record;
  source_id uuid;
  target_id uuid;
begin
  for merge_row in select * from poll_category_slug_merges order by source_slug loop
    select id into source_id from public.poll_categories where slug = merge_row.source_slug;
    select id into target_id from public.poll_categories where slug = merge_row.target_slug;

    if source_id is null or target_id is null then
      continue;
    end if;

    update public.polls
    set category_id = target_id
    where category_id = source_id;

    update public.gallery_media gm
    set media_category = target.name
    from public.poll_categories target
    where target.id = target_id
      and (
        gm.media_category = (select name from public.poll_categories where id = source_id)
        or gm.media_category ilike merge_row.source_slug
      );

    update public.player_profiles
    set preferred_poll_categories = (
      select coalesce(
        jsonb_agg(
          case
            when elem.value = merge_row.source_slug then merge_row.target_slug
            else elem.value
          end
        ),
        '[]'::jsonb
      )
      from jsonb_array_elements_text(preferred_poll_categories) as elem(value)
    )
    where jsonb_typeof(preferred_poll_categories) = 'array'
      and preferred_poll_categories ? merge_row.source_slug;

    update public.player_profiles
    set default_play_poll_category = merge_row.target_slug
    where default_play_poll_category = merge_row.source_slug;

    delete from public.poll_categories where id = source_id;
  end loop;
end $$;

update public.poll_categories
set
  name = public.format_poll_category_name(slug),
  updated_at = now()
where sort_order >= 1000;

update public.poll_categories
set
  name = 'Hardware & OS',
  slug = 'hardware-os',
  updated_at = now()
where slug = 'hardware-and-os';

update public.player_profiles
set default_play_poll_category = 'hardware-os'
where default_play_poll_category = 'hardware-and-os';

update public.player_profiles
set preferred_poll_categories = (
  select coalesce(
    jsonb_agg(
      case
        when elem.value = 'hardware-and-os' then 'hardware-os'
        else elem.value
      end
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements_text(preferred_poll_categories) as elem(value)
)
where jsonb_typeof(preferred_poll_categories) = 'array'
  and preferred_poll_categories ? 'hardware-and-os';
