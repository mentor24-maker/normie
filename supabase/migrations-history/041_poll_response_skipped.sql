-- Track skipped polls separately from real answers (no points, excluded from vote totals).

alter table public.poll_response
add column if not exists is_skipped boolean not null default false;

create index if not exists poll_response_skipped_idx
on public.poll_response (poll_id, is_skipped)
where is_skipped = true;
