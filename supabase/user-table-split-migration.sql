-- Run after copying the old admin-style rows from public.users into public.team_users.
-- This converts public.users into a plain public/end-user contact table.

drop index if exists public.users_role_idx;

alter table public.users
  drop constraint if exists users_id_fkey,
  drop constraint if exists users_role_check,
  drop constraint if exists users_status_check;

alter table public.users
  add column if not exists email text,
  add column if not exists first_name text not null default '',
  add column if not exists last_name text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists source text not null default 'manual';

update public.users
set
  email = coalesce(nullif(email, ''), id::text || '@legacy.local'),
  status = case
    when status in ('active') then 'active'
    when status in ('suspended') then 'blocked'
    else 'lead'
  end,
  source = coalesce(nullif(source, ''), 'legacy')
where email is null or email = '' or status not in ('lead', 'active', 'unsubscribed', 'blocked');

alter table public.users
  alter column email set not null,
  alter column status set default 'lead',
  add constraint users_status_check check (status in ('lead', 'active', 'unsubscribed', 'blocked'));

alter table public.users
  drop column if exists role;

create unique index if not exists users_email_unique_idx on public.users (email);
create unique index if not exists users_email_lower_unique_idx on public.users (lower(email));
create index if not exists users_status_idx on public.users (status);
