-- Remove player records that no longer belong to a live poll, and expand cleanup to reactions.

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
        and p.is_hidden = false
    )
    returning r.id
  )
  select count(*)::integer into deleted_count from deleted;

  return coalesce(deleted_count, 0);
end;
$$;

create or replace function public.purge_orphan_poll_reactions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  with deleted as (
    delete from public.poll_reaction r
    where not exists (
      select 1
      from public.polls p
      where p.id = r.poll_id
        and p.is_published = true
        and p.is_hidden = false
    )
    returning r.id
  )
  select count(*)::integer into deleted_count from deleted;

  return coalesce(deleted_count, 0);
end;
$$;

revoke all on function public.purge_orphan_poll_reactions() from public;
grant execute on function public.purge_orphan_poll_reactions() to service_role;

-- One-time cleanup for legacy rows left behind after poll deletes.
delete from public.poll_response r
where not exists (
  select 1 from public.polls p where p.id = r.poll_id
);

delete from public.poll_reaction r
where not exists (
  select 1 from public.polls p where p.id = r.poll_id
);

notify pgrst, 'reload schema';
