-- Blog: posts, topics, tags, related posts (idempotent).

create table if not exists public.blog_topics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_topics_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index if not exists blog_topics_slug_unique_idx on public.blog_topics (slug);

create table if not exists public.blog_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_tags_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index if not exists blog_tags_slug_unique_idx on public.blog_tags (slug);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  excerpt text not null default '',
  body_html text not null default '',
  featured_image_url text not null default '',
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published')),
  published_at timestamptz,
  author_team_user_id uuid references public.team_users(id) on delete set null,
  primary_topic_id uuid references public.blog_topics(id) on delete set null,
  meta_title text not null default '',
  meta_description text not null default '',
  og_title text not null default '',
  og_description text not null default '',
  og_image_url text not null default '',
  twitter_card_type text not null default 'summary_large_image'
    check (twitter_card_type in ('summary', 'summary_large_image')),
  canonical_url text not null default '',
  noindex boolean not null default false,
  reading_time_minutes integer not null default 0 check (reading_time_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_posts_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index if not exists blog_posts_slug_unique_idx on public.blog_posts (slug);
create index if not exists blog_posts_status_published_at_idx on public.blog_posts (status, published_at desc);
create index if not exists blog_posts_primary_topic_id_idx on public.blog_posts (primary_topic_id);

create table if not exists public.blog_post_topics (
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  topic_id uuid not null references public.blog_topics(id) on delete cascade,
  primary key (post_id, topic_id)
);

create index if not exists blog_post_topics_topic_id_idx on public.blog_post_topics (topic_id);

create table if not exists public.blog_post_tags (
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  tag_id uuid not null references public.blog_tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

create index if not exists blog_post_tags_tag_id_idx on public.blog_post_tags (tag_id);

create table if not exists public.blog_post_related_posts (
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  related_post_id uuid not null references public.blog_posts(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (post_id, related_post_id),
  constraint blog_post_related_posts_not_self check (post_id <> related_post_id)
);

alter table public.blog_topics enable row level security;
alter table public.blog_tags enable row level security;
alter table public.blog_posts enable row level security;
alter table public.blog_post_topics enable row level security;
alter table public.blog_post_tags enable row level security;
alter table public.blog_post_related_posts enable row level security;

drop policy if exists "blog topics are readable" on public.blog_topics;
create policy "blog topics are readable"
on public.blog_topics
for select
to anon, authenticated
using (true);

drop policy if exists "blog tags are readable" on public.blog_tags;
create policy "blog tags are readable"
on public.blog_tags
for select
to anon, authenticated
using (true);

drop policy if exists "published blog posts are readable" on public.blog_posts;
create policy "published blog posts are readable"
on public.blog_posts
for select
to anon, authenticated
using (
  status in ('published', 'scheduled')
  and published_at is not null
  and published_at <= now()
);

drop policy if exists "blog post topics are readable for published posts" on public.blog_post_topics;
create policy "blog post topics are readable for published posts"
on public.blog_post_topics
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.blog_posts
    where public.blog_posts.id = public.blog_post_topics.post_id
      and public.blog_posts.status in ('published', 'scheduled')
      and public.blog_posts.published_at is not null
      and public.blog_posts.published_at <= now()
  )
);

drop policy if exists "blog post tags are readable for published posts" on public.blog_post_tags;
create policy "blog post tags are readable for published posts"
on public.blog_post_tags
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.blog_posts
    where public.blog_posts.id = public.blog_post_tags.post_id
      and public.blog_posts.status in ('published', 'scheduled')
      and public.blog_posts.published_at is not null
      and public.blog_posts.published_at <= now()
  )
);

drop policy if exists "blog post related posts are readable for published posts" on public.blog_post_related_posts;
create policy "blog post related posts are readable for published posts"
on public.blog_post_related_posts
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.blog_posts
    where public.blog_posts.id = public.blog_post_related_posts.post_id
      and public.blog_posts.status in ('published', 'scheduled')
      and public.blog_posts.published_at is not null
      and public.blog_posts.published_at <= now()
  )
);
