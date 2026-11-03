-- Registered players are identified by user_id, not by the browser session cookie.
-- Keep one anonymous response per session/poll, but allow different player accounts
-- to answer the same poll from the same browser session.

alter table if exists public.poll_response
drop constraint if exists poll_response_session_id_poll_id_key;

alter table if exists public.poll_response
drop constraint if exists responses_session_id_poll_id_key;

create unique index if not exists poll_response_anonymous_session_poll_unique_idx
on public.poll_response (session_id, poll_id)
where user_id is null;

create unique index if not exists poll_response_user_poll_unique_idx
on public.poll_response (user_id, poll_id)
where user_id is not null;

notify pgrst, 'reload schema';
