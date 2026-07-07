-- Hide polls from the public site and player portal without deleting them.

alter table public.polls
add column if not exists is_hidden boolean not null default false;

create index if not exists polls_public_visible_idx
on public.polls (is_published, is_hidden, order_index);

drop policy if exists "published polls are readable" on public.polls;

create policy "published polls are readable"
on public.polls
for select
to anon, authenticated
using (is_published = true and is_hidden = false);

drop policy if exists "published poll options are readable" on public.poll_options;
drop policy if exists "poll_options are readable for published polls" on public.poll_options;

create policy "published poll options are readable"
on public.poll_options
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.polls
    where public.polls.id = public.poll_options.poll_id
      and public.polls.is_published = true
      and public.polls.is_hidden = false
  )
);

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
      and public.polls.is_hidden = false
  )
);

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
      and public.polls.is_hidden = false
  )
);
