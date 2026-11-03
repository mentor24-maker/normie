create table if not exists public.blog_settings (
  id text primary key,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.blog_settings (id, settings)
values ('default', '{}'::jsonb)
on conflict (id) do nothing;

alter table public.blog_settings enable row level security;

drop policy if exists "Blog settings are publicly readable" on public.blog_settings;
create policy "Blog settings are publicly readable"
  on public.blog_settings
  for select
  using (true);
