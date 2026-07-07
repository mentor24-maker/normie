-- Blog categories (parallel to topics).

create table if not exists public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index if not exists blog_categories_slug_unique_idx on public.blog_categories (slug);

alter table public.blog_posts
  add column if not exists primary_category_id uuid references public.blog_categories(id) on delete set null;

create index if not exists blog_posts_primary_category_id_idx on public.blog_posts (primary_category_id);

create table if not exists public.blog_post_categories (
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  category_id uuid not null references public.blog_categories(id) on delete cascade,
  primary key (post_id, category_id)
);

create index if not exists blog_post_categories_category_id_idx on public.blog_post_categories (category_id);

alter table public.blog_categories enable row level security;
alter table public.blog_post_categories enable row level security;

drop policy if exists "blog categories are readable" on public.blog_categories;
create policy "blog categories are readable"
on public.blog_categories
for select
to anon, authenticated
using (true);

drop policy if exists "blog post categories are readable for published posts" on public.blog_post_categories;
create policy "blog post categories are readable for published posts"
on public.blog_post_categories
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.blog_posts
    where public.blog_posts.id = public.blog_post_categories.post_id
      and public.blog_posts.status in ('published', 'scheduled')
      and public.blog_posts.published_at is not null
      and public.blog_posts.published_at <= now()
  )
);
