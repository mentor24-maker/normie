-- Metadata for files in the Supabase Storage `gallery` bucket (not the files themselves).

create table if not exists public.gallery_media (
  storage_name text primary key,
  badge boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gallery_media_badge_idx
on public.gallery_media (badge)
where badge = true;

alter table public.gallery_media enable row level security;

drop policy if exists "gallery media is readable" on public.gallery_media;
create policy "gallery media is readable"
on public.gallery_media
for select
to anon, authenticated
using (true);

grant select on public.gallery_media to anon, authenticated, service_role;
grant insert, update, delete on public.gallery_media to service_role;
