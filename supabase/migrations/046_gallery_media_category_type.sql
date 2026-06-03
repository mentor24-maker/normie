-- Gallery file taxonomy: poll-aligned category + asset usage type.

alter table public.gallery_media
add column if not exists media_category text not null default '';

alter table public.gallery_media
add column if not exists media_type text not null default '';

create index if not exists gallery_media_media_category_idx
on public.gallery_media (media_category)
where media_category <> '';

create index if not exists gallery_media_media_type_idx
on public.gallery_media (media_type)
where media_type <> '';

-- Aspect added in 047_gallery_media_aspect.sql if this migration ran before aspect existed.
alter table public.gallery_media
add column if not exists aspect text not null default 'square';
