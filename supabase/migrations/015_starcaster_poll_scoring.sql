-- Starcaster "Would You Rather" CSV import columns (see normie_200_* Starcaster Import.csv).
-- Idempotent with 012_poll_advanced_scoring.sql for environments that skipped it.

alter table public.polls
  add column if not exists source_question_id text not null default '',
  add column if not exists personality_system text not null default '',
  add column if not exists trait_dimension text not null default '',
  add column if not exists option_a_score_code text not null default '',
  add column if not exists option_b_score_code text not null default '',
  add column if not exists scoring_logic text not null default '',
  add column if not exists scoring_weight numeric not null default 1,
  add column if not exists reverse_scored boolean not null default false,
  add column if not exists ai_interpretation_tag text not null default '';
