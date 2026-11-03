-- Like / Dislike reactions on previous poll results (progressive feature reward).

create table if not exists public.poll_reaction (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  poll_id uuid not null references public.polls(id) on delete cascade,
  reaction text not null check (reaction in ('like', 'dislike')),
  tokens_earned integer not null default 0 check (tokens_earned >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, poll_id)
);

create index if not exists poll_reaction_user_id_idx on public.poll_reaction (user_id);
create index if not exists poll_reaction_poll_id_idx on public.poll_reaction (poll_id);
create index if not exists poll_reaction_updated_at_idx on public.poll_reaction (updated_at desc);

alter table public.poll_reaction enable row level security;

drop policy if exists "poll reactions are readable for published polls" on public.poll_reaction;
create policy "poll reactions are readable for published polls"
on public.poll_reaction
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.polls
    where public.polls.id = public.poll_reaction.poll_id
      and public.polls.is_published = true
      and public.polls.is_hidden = false
  )
);

grant select on public.poll_reaction to anon, authenticated, service_role;
grant insert, update, delete on public.poll_reaction to service_role;

insert into public.game_scoring (score_name, description, specific_criteria, points)
select
  'Poll Like',
  'Awarded when a signed-in player likes a poll they already answered.',
  'Player must react with Like on a previous poll in the results panel.',
  2
where not exists (
  select 1 from public.game_scoring where score_name = 'Poll Like'
);

insert into public.game_scoring (score_name, description, specific_criteria, points)
select
  'Poll Dislike',
  'Awarded when a signed-in player dislikes a poll they already answered.',
  'Player must react with Dislike on a previous poll in the results panel.',
  2
where not exists (
  select 1 from public.game_scoring where score_name = 'Poll Dislike'
);

insert into public.game_progressive_features (feature_key, name, description, unlock_level_name, unlock_sublevel_name, is_active, metadata)
values
  (
    'poll_like_dislike',
    'Like and Dislike',
    'Shows Like and Dislike controls on previous poll results so players can react and earn points.',
    'Level',
    '2',
    true,
    '{"uiPlacement":"previous_results_corners"}'::jsonb
  )
on conflict (feature_key) do nothing;

notify pgrst, 'reload schema';
