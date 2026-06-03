 -- Canonical poll categories (replaces free-text polls.category).

create table if not exists public.poll_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  sort_order integer not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint poll_categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index if not exists poll_categories_slug_unique_idx on public.poll_categories (slug);
create unique index if not exists poll_categories_name_lower_unique_idx on public.poll_categories (lower(name));

insert into public.poll_categories (name, slug, sort_order)
values
  ('Identity & Psychology', 'identity-psychology', 1),
  ('Money & Success', 'money-success', 2),
  ('Dark / Truth', 'dark-truth', 3),
  ('Social & Relationships', 'social-relationships', 4),
  ('Life Tradeoffs', 'life-tradeoffs', 5),
  ('Future / Power', 'future-power', 6),
  ('Self-Perception', 'self-perception', 7),
  ('Behavior & Habits', 'behavior-habits', 8),
  ('Modern Life / Digital', 'modern-life-digital', 9),
  ('Absurd but Revealing', 'absurd-but-revealing', 10)
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  updated_at = now();

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
    else trim(value)
  end;
$$;

insert into public.poll_categories (name, slug, sort_order)
select distinct on (public.slugify_poll_category_label(p.category))
  public.format_poll_category_name(p.category) as name,
  public.slugify_poll_category_label(p.category) as slug,
  1000 as sort_order
from public.polls p
where trim(coalesce(p.category, '')) <> ''
  and public.slugify_poll_category_label(p.category) <> ''
  and not exists (
    select 1
    from public.poll_categories pc
    where pc.slug = public.slugify_poll_category_label(p.category)
       or lower(pc.name) = lower(trim(p.category))
  )
order by public.slugify_poll_category_label(p.category), length(trim(p.category)) desc
on conflict (slug) do nothing;

alter table public.polls
  add column if not exists category_id uuid references public.poll_categories(id) on delete set null;

create index if not exists polls_category_id_idx on public.polls (category_id);

update public.polls p
set category_id = pc.id
from public.poll_categories pc
where p.category_id is null
  and trim(coalesce(p.category, '')) <> ''
  and (
    pc.slug = public.slugify_poll_category_label(p.category)
    or lower(pc.name) = lower(trim(p.category))
  );

update public.player_profiles pp
set preferred_poll_categories = coalesce(
  (
    select jsonb_agg(pc.slug order by elem.ordinality)
    from jsonb_array_elements_text(pp.preferred_poll_categories) with ordinality as elem(value, ordinality)
    join public.poll_categories pc
      on pc.slug = public.slugify_poll_category_label(elem.value)
      or lower(pc.name) = lower(trim(elem.value))
  ),
  '[]'::jsonb
)
where jsonb_typeof(pp.preferred_poll_categories) = 'array'
  and jsonb_array_length(pp.preferred_poll_categories) > 0;

update public.player_profiles pp
set default_play_poll_category = pc.slug
from public.poll_categories pc
where pp.default_play_poll_category is not null
  and trim(pp.default_play_poll_category) <> ''
  and (
    pc.slug = public.slugify_poll_category_label(pp.default_play_poll_category)
    or lower(pc.name) = lower(trim(pp.default_play_poll_category))
  );

alter table public.polls drop column if exists category;

alter table public.poll_categories enable row level security;

drop policy if exists "poll categories are readable" on public.poll_categories;
create policy "poll categories are readable"
on public.poll_categories
for select
to anon, authenticated
using (true);
