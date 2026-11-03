-- Layout aspect for gallery assets (tall / wide / square).

alter table public.gallery_media
add column if not exists aspect text not null default 'square';

alter table public.gallery_media
drop constraint if exists gallery_media_aspect_check;

alter table public.gallery_media
add constraint gallery_media_aspect_check
check (aspect in ('tall', 'wide', 'square'));

create index if not exists gallery_media_aspect_idx
on public.gallery_media (aspect);
