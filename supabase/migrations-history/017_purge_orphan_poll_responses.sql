-- Remove player/session answers that no longer map to a published poll
-- (e.g. after bulk poll delete, unpublish, or re-import).

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
