-- Poll import collections: Standard, Personality Type A, Personality Type B.

alter table public.polls
  add column if not exists collection text not null default '';

-- Standard uploads: no personality / scoring metadata.
update public.polls
set collection = 'Standard'
where trim(coalesce(collection, '')) = ''
  and trim(coalesce(personality_system, '')) = ''
  and trim(coalesce(trait_dimension, '')) = ''
  and trim(coalesce(option_a_score_code, '')) = ''
  and trim(coalesce(option_b_score_code, '')) = ''
  and trim(coalesce(scoring_logic, '')) = ''
  and trim(coalesce(ai_interpretation_tag, '')) = ''
  and trim(coalesce(source_question_id, '')) = '';

-- Personality Type B: category mirrors personality_system (Type B import mapping).
update public.polls
set collection = 'Personality Type B'
where trim(coalesce(collection, '')) = ''
  and trim(coalesce(personality_system, '')) <> ''
  and trim(coalesce(category, '')) = trim(coalesce(personality_system, ''));

-- Personality Type A: remaining rows with scoring metadata.
update public.polls
set collection = 'Personality Type A'
where trim(coalesce(collection, '')) = ''
  and (
    trim(coalesce(personality_system, '')) <> ''
    or trim(coalesce(trait_dimension, '')) <> ''
    or trim(coalesce(option_a_score_code, '')) <> ''
    or trim(coalesce(option_b_score_code, '')) <> ''
    or trim(coalesce(scoring_logic, '')) <> ''
    or trim(coalesce(ai_interpretation_tag, '')) <> ''
    or trim(coalesce(source_question_id, '')) <> ''
  );

update public.polls
set collection = 'Standard'
where trim(coalesce(collection, '')) = '';

alter table public.polls
  alter column collection set default 'Standard';

alter table public.polls
  drop constraint if exists polls_collection_check;

alter table public.polls
  add constraint polls_collection_check
  check (
    collection in ('Standard', 'Personality Type A', 'Personality Type B')
  );

create index if not exists polls_collection_idx on public.polls (collection);
