-- Rename the poll answer ledger from public.responses to public.poll_response.
-- Keeps existing rows and rebuilds the table-facing policy/index names.

do $$
begin
  if to_regclass('public.poll_response') is null and to_regclass('public.responses') is not null then
    alter table public.responses rename to poll_response;
  end if;
end $$;

do $$
begin
  if to_regclass('public.poll_response') is not null and exists (
    select 1 from pg_constraint
    where conname = 'responses_pkey'
      and conrelid = 'public.poll_response'::regclass
  ) then
    alter table public.poll_response rename constraint responses_pkey to poll_response_pkey;
  end if;

  if to_regclass('public.poll_response') is not null and exists (
    select 1 from pg_constraint
    where conname = 'responses_session_id_poll_id_key'
      and conrelid = 'public.poll_response'::regclass
  ) then
    alter table public.poll_response
    rename constraint responses_session_id_poll_id_key to poll_response_session_id_poll_id_key;
  end if;

  if to_regclass('public.poll_response') is not null and exists (
    select 1 from pg_constraint
    where conname = 'responses_user_id_fkey'
      and conrelid = 'public.poll_response'::regclass
  ) then
    alter table public.poll_response rename constraint responses_user_id_fkey to poll_response_user_id_fkey;
  end if;
end $$;

alter index if exists public.responses_poll_id_idx rename to poll_response_poll_id_idx;
alter index if exists public.responses_session_id_idx rename to poll_response_session_id_idx;
alter index if exists public.responses_user_id_idx rename to poll_response_user_id_idx;
alter index if exists public.responses_user_poll_unique_idx rename to poll_response_user_poll_unique_idx;

drop policy if exists "responses are readable for published polls" on public.poll_response;
drop policy if exists "poll_response rows are readable for published polls" on public.poll_response;
create policy "poll_response rows are readable for published polls"
on public.poll_response
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.polls
    where public.polls.id = public.poll_response.poll_id
      and public.polls.is_published = true
  )
);

drop policy if exists "anon can insert responses for published polls" on public.poll_response;
drop policy if exists "anon can insert poll_response for published polls" on public.poll_response;
create policy "anon can insert poll_response for published polls"
on public.poll_response
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.polls
    where public.polls.id = poll_id
      and public.polls.is_published = true
  )
  and exists (
    select 1
    from public.poll_options
    where public.poll_options.id = option_id
      and public.poll_options.poll_id = poll_id
  )
);

create or replace function public.purge_orphan_poll_responses()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  with deleted as (
    delete from public.poll_response r
    where not exists (
      select 1
      from public.polls p
      where p.id = r.poll_id
        and p.is_published = true
    )
    returning r.id
  )
  select count(*)::integer into deleted_count from deleted;

  return coalesce(deleted_count, 0);
end;
$$;

revoke all on function public.purge_orphan_poll_responses() from public;
grant execute on function public.purge_orphan_poll_responses() to service_role;

grant select, insert, update on public.poll_response to anon, authenticated, service_role;

notify pgrst, 'reload schema';
