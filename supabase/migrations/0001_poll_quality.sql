-- Add a manual content-quality rating to polls so mass-generated, overly
-- narrow/arcane polls can be triaged and bulk-deleted from Poll Manager.
--
-- 1 = good (broad appeal), 2 = borderline (needs a look), 3 = bad (arcane /
-- narrow industry-specific, safe to bulk-delete). Defaults new rows to 1.

alter table public.polls
  add column if not exists quality smallint not null default 1
  check (quality between 1 and 3);

create index if not exists polls_quality_idx on public.polls (quality);
