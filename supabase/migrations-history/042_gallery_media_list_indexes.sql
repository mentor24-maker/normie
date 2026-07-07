-- Indexes for filtered, sorted gallery media library queries.

create index if not exists gallery_media_created_at_idx
on public.gallery_media (created_at desc);

create index if not exists gallery_media_storage_name_idx
on public.gallery_media (storage_name);

create index if not exists gallery_media_badge_storage_name_idx
on public.gallery_media (badge, storage_name);
