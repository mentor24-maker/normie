-- Survey interstitial responses: one submission per interstitial per player or session.

create table if not exists public.game_interstitial_responses (
  id uuid primary key default gen_random_uuid(),
  interstitial_id uuid not null references public.game_interstitials(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  session_id text not null default '',
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists game_interstitial_responses_interstitial_idx
on public.game_interstitial_responses (interstitial_id);

create index if not exists game_interstitial_responses_user_idx
on public.game_interstitial_responses (user_id)
where user_id is not null;

create index if not exists game_interstitial_responses_session_idx
on public.game_interstitial_responses (session_id)
where session_id <> '';

create unique index if not exists game_interstitial_responses_user_unique
on public.game_interstitial_responses (interstitial_id, user_id)
where user_id is not null;

create unique index if not exists game_interstitial_responses_session_unique
on public.game_interstitial_responses (interstitial_id, session_id)
where user_id is null and session_id <> '';

alter table public.game_interstitial_responses enable row level security;

drop policy if exists "game interstitial responses are readable" on public.game_interstitial_responses;
create policy "game interstitial responses are readable"
on public.game_interstitial_responses
for select
to anon, authenticated
using (true);

grant select on public.game_interstitial_responses to anon, authenticated, service_role;
grant insert, update, delete on public.game_interstitial_responses to service_role;

notify pgrst, 'reload schema';
