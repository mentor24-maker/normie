-- Normie canonical database schema (idempotent).
--
-- New Supabase project:
--   1. Run this file in the SQL Editor.
--   2. Optionally run seed.sql.
--
-- Existing project that already ran an older schema:
--   1. Run migrations/000_incremental.sql
--   2. Run migrations/001_legacy_users_split.sql only if you still have admin rows in public.users.
--
-- RLS summary:
--   Public read (anon): published polls, poll_options, responses, poll_settings, pages, blog, builder library (cell modules, saved sections).
--   Public write (anon): responses insert (validated in API + policy).
--   Server-only (service role): users, team_users, builder tables, products,
--     page_templates, api_rate_limits, blog admin mutations, and other admin writes.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Polls
-- ---------------------------------------------------------------------------
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  category varchar,
  source_question_id text not null default '',
  personality_system text not null default '',
  trait_dimension text not null default '',
  option_a_score_code text not null default '',
  option_b_score_code text not null default '',
  scoring_logic text not null default '',
  scoring_weight numeric not null default 1,
  reverse_scored boolean not null default false,
  ai_interpretation_tag text not null default '',
  collection text not null default 'Standard' check (
    collection in ('Standard', 'Personality Type A', 'Personality Type B')
  ),
  question text not null,
  deep_dive text not null default '',
  deep_dive_youtube_url text not null default '',
  deep_dive_blog_post_id uuid references public.blog_posts(id) on delete set null,
  deep_dive_related_poll_ids jsonb not null default '[]'::jsonb,
  image_url text not null default '',
  order_index integer not null unique,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_id uuid,
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  tokens_earned integer not null default 0,
  created_at timestamptz not null default now(),
  unique (session_id, poll_id)
);

create table if not exists public.player_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  handle text not null,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (handle)
);

create table if not exists public.poll_settings (
  id text primary key default 'default' check (id = 'default'),
  previous_results_empty_eyebrow text not null default 'How It Works',
  previous_results_empty_content_html text not null default '',
  pod_background_color text not null default 'transparent',
  header_background_color text not null default '#5acff9',
  header_font_color text not null default '#0c5f72',
  header_font_size text not null default '1.08',
  header_border_size text not null default '0',
  header_border_color text not null default 'transparent',
  header_drop_shadow_enabled text not null default 'false',
  header_drop_shadow_x text not null default '0',
  header_drop_shadow_y text not null default '12',
  header_drop_shadow_blur text not null default '30',
  header_drop_shadow_color text not null default '#322217',
  header_drop_shadow_opacity text not null default '8',
  question_area_width text not null default '100',
  answer_button_a_background text not null default '#ffffff',
  answer_button_b_background text not null default '#ffffff',
  answer_button_a_border_size text not null default '1',
  answer_button_b_border_size text not null default '1',
  answer_button_a_border_color text not null default '#091018',
  answer_button_b_border_color text not null default '#091018',
  answer_button_a_font_color text not null default '#091018',
  answer_button_b_font_color text not null default '#091018',
  answer_button_a_font_size text not null default '1',
  answer_button_b_font_size text not null default '1',
  pod_configs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.poll_settings (id, previous_results_empty_eyebrow, previous_results_empty_content_html)
values (
  'default',
  'How It Works',
  '<h2>Vote left, watch the story unfold on the right.</h2><p>Each screen invites you into the next question while showing the community response to the previous prompt.</p>'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Builder pages
-- ---------------------------------------------------------------------------
create table if not exists public.page_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template_kind text not null default 'modular',
  layout_sections jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  template_id uuid references public.page_templates(id) on delete set null,
  layout_sections jsonb not null default '[]'::jsonb,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Users: public leads (contact form) vs team (admin) in separate tables
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  full_name text not null default '',
  phone text not null default '',
  status text not null default 'lead' check (status in ('lead', 'active', 'unsubscribed', 'blocked')),
  source text not null default 'manual',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'editor' check (role in ('owner', 'admin', 'editor', 'viewer')),
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Builder library + shop catalog (admin-managed)
-- ---------------------------------------------------------------------------
create table if not exists public.builder_cell_modules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  modules jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.builder_saved_sections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  section jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  product_type text not null default 'merch' check (product_type in ('merch', 'personality_profile')),
  product_url text not null default '',
  image_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Blog
-- ---------------------------------------------------------------------------
create table if not exists public.blog_settings (
  id text primary key,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.blog_topics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_topics_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.blog_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_tags_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

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
  primary_category_id uuid references public.blog_categories(id) on delete set null,
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

create table if not exists public.blog_post_topics (
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  topic_id uuid not null references public.blog_topics(id) on delete cascade,
  primary key (post_id, topic_id)
);

create table if not exists public.blog_post_tags (
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  tag_id uuid not null references public.blog_tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

create table if not exists public.blog_post_categories (
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  category_id uuid not null references public.blog_categories(id) on delete cascade,
  primary key (post_id, category_id)
);

create table if not exists public.blog_post_related_posts (
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  related_post_id uuid not null references public.blog_posts(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (post_id, related_post_id),
  constraint blog_post_related_posts_not_self check (post_id <> related_post_id)
);

-- ---------------------------------------------------------------------------
-- Server-side rate limiting (no RLS policies; service role only)
-- ---------------------------------------------------------------------------
create table if not exists public.api_rate_limits (
  bucket text primary key,
  hits integer not null default 1 check (hits > 0),
  expires_at timestamptz not null
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
alter table public.responses
add column if not exists user_id uuid;

alter table public.responses
add column if not exists tokens_earned integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'responses_user_id_fkey'
  ) then
    alter table public.responses
    add constraint responses_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete set null;
  end if;
end $$;

create index if not exists responses_poll_id_idx on public.responses (poll_id);
create index if not exists responses_session_id_idx on public.responses (session_id);
create index if not exists responses_user_id_idx on public.responses (user_id);
create unique index if not exists responses_user_poll_unique_idx
on public.responses (user_id, poll_id)
where user_id is not null;
create index if not exists poll_options_poll_id_idx on public.poll_options (poll_id);
create index if not exists page_templates_updated_at_idx on public.page_templates (updated_at desc);
create index if not exists pages_updated_at_idx on public.pages (updated_at desc);
create index if not exists pages_slug_idx on public.pages (slug);
create unique index if not exists users_email_unique_idx on public.users (email);
create unique index if not exists users_email_lower_unique_idx on public.users (lower(email));
create index if not exists users_status_idx on public.users (status);
create index if not exists team_users_role_idx on public.team_users (role);
create index if not exists builder_cell_modules_updated_at_idx on public.builder_cell_modules (updated_at desc);
create index if not exists builder_saved_sections_updated_at_idx on public.builder_saved_sections (updated_at desc);
create index if not exists products_product_type_idx on public.products (product_type);
create index if not exists products_updated_at_idx on public.products (updated_at desc);
create unique index if not exists blog_topics_slug_unique_idx on public.blog_topics (slug);
create unique index if not exists blog_tags_slug_unique_idx on public.blog_tags (slug);
create unique index if not exists blog_categories_slug_unique_idx on public.blog_categories (slug);
create unique index if not exists blog_posts_slug_unique_idx on public.blog_posts (slug);
create index if not exists blog_posts_status_published_at_idx on public.blog_posts (status, published_at desc);
create index if not exists blog_posts_primary_topic_id_idx on public.blog_posts (primary_topic_id);
create index if not exists blog_posts_primary_category_id_idx on public.blog_posts (primary_category_id);
create index if not exists blog_post_topics_topic_id_idx on public.blog_post_topics (topic_id);
create index if not exists blog_post_categories_category_id_idx on public.blog_post_categories (category_id);
create index if not exists blog_post_tags_tag_id_idx on public.blog_post_tags (tag_id);
create index if not exists api_rate_limits_expires_at_idx on public.api_rate_limits (expires_at);
create index if not exists player_profiles_status_idx on public.player_profiles (status);
create index if not exists player_profiles_handle_idx on public.player_profiles (handle);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.responses enable row level security;
alter table public.player_profiles enable row level security;
alter table public.poll_settings enable row level security;
alter table public.page_templates enable row level security;
alter table public.pages enable row level security;
alter table public.users enable row level security;
alter table public.team_users enable row level security;
alter table public.builder_cell_modules enable row level security;
alter table public.builder_saved_sections enable row level security;
alter table public.products enable row level security;
alter table public.blog_settings enable row level security;
alter table public.blog_topics enable row level security;
alter table public.blog_tags enable row level security;
alter table public.blog_categories enable row level security;
alter table public.blog_posts enable row level security;
alter table public.blog_post_topics enable row level security;
alter table public.blog_post_tags enable row level security;
alter table public.blog_post_categories enable row level security;
alter table public.blog_post_related_posts enable row level security;
alter table public.api_rate_limits enable row level security;

drop policy if exists "poll settings are readable" on public.poll_settings;
create policy "poll settings are readable"
on public.poll_settings
for select
to anon, authenticated
using (true);

-- Public read: published polls
drop policy if exists "published polls are readable" on public.polls;
create policy "published polls are readable"
on public.polls
for select
to anon, authenticated
using (is_published = true);

drop policy if exists "published poll options are readable" on public.poll_options;
create policy "published poll options are readable"
on public.poll_options
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.polls
    where public.polls.id = public.poll_options.poll_id
      and public.polls.is_published = true
  )
);

drop policy if exists "responses are readable for published polls" on public.responses;
create policy "responses are readable for published polls"
on public.responses
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.polls
    where public.polls.id = public.responses.poll_id
      and public.polls.is_published = true
  )
);

drop policy if exists "anon can insert responses for published polls" on public.responses;
create policy "anon can insert responses for published polls"
on public.responses
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.polls
    where public.polls.id = poll_id
      and public.polls.is_published = true
  )
  and exists (
    select 1
    from public.poll_options
    where public.poll_options.id = option_id
      and public.poll_options.poll_id = poll_id
  )
);

drop policy if exists "active player profiles are readable" on public.player_profiles;
create policy "active player profiles are readable"
on public.player_profiles
for select
to anon, authenticated
using (status = 'active');

drop policy if exists "players can read own profile" on public.player_profiles;
create policy "players can read own profile"
on public.player_profiles
for select
to authenticated
using (auth.uid() = id);

grant select, insert, update on public.player_profiles to anon, authenticated, service_role;
grant select, insert, update on public.responses to anon, authenticated, service_role;

notify pgrst, 'reload schema';

drop policy if exists "published pages are readable" on public.pages;
create policy "published pages are readable"
on public.pages
for select
to anon, authenticated
using (is_published = true);

drop policy if exists "builder cell modules are readable" on public.builder_cell_modules;
create policy "builder cell modules are readable"
on public.builder_cell_modules
for select
to anon, authenticated
using (true);

drop policy if exists "builder saved sections are readable" on public.builder_saved_sections;
create policy "builder saved sections are readable"
on public.builder_saved_sections
for select
to anon, authenticated
using (true);

drop policy if exists "blog settings are readable" on public.blog_settings;
create policy "blog settings are readable"
on public.blog_settings
for select
to anon, authenticated
using (true);

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

drop policy if exists "blog categories are readable" on public.blog_categories;
create policy "blog categories are readable"
on public.blog_categories
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
