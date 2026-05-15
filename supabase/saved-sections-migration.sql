create table if not exists public.builder_saved_sections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  section jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists builder_saved_sections_updated_at_idx
on public.builder_saved_sections (updated_at desc);

alter table public.builder_saved_sections enable row level security;
