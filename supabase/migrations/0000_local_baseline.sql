-- LOCAL BOOTSTRAP BASELINE - DO NOT APPLY TO PRODUCTION.
-- Production predates the migration chain and already contains all of this
-- (it was built from schema.sql by hand). This file exists so the Supabase
-- CLI can build a fresh LOCAL database: it sorts before 000_incremental.sql
-- and provides the base schema the incremental migrations patch. Everything
-- is idempotent, so the later migrations re-applying overlapping statements
-- is harmless.

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
--   Public read (anon): published polls, poll_options, poll_response, poll_settings, pages, blog, builder library (cell modules, saved sections).
--   Public write (anon): poll_response insert (validated in API + policy).
--   Server-only (service role): users, team_users, builder tables, products,
--     page_templates, api_rate_limits, blog admin mutations, and other admin writes.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Poll categories
-- ---------------------------------------------------------------------------
create table if not exists public.poll_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  sort_order integer not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint poll_categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index if not exists poll_categories_slug_unique_idx on public.poll_categories (slug);
create unique index if not exists poll_categories_name_lower_unique_idx on public.poll_categories (lower(name));

-- ---------------------------------------------------------------------------
-- Polls
-- ---------------------------------------------------------------------------
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.poll_categories(id) on delete set null,
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
  deep_dive_blog_post_id uuid,
  deep_dive_related_poll_ids jsonb not null default '[]'::jsonb,
  image_url text not null default '',
  order_index integer not null unique,
  is_published boolean not null default true,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.poll_response (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_id uuid,
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  tokens_earned integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.poll_reaction (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  poll_id uuid not null references public.polls(id) on delete cascade,
  reaction text not null check (reaction in ('like', 'dislike')),
  tokens_earned integer not null default 0 check (tokens_earned >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, poll_id)
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
  email_function text,
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
  module_class text not null default '',
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

create table if not exists public.game_level_tiers (
  id uuid primary key default gen_random_uuid(),
  level integer not null check (level > 0),
  tier text not null,
  name text not null,
  points_required integer not null default 0 check (points_required >= 0),
  sort_order integer not null default 0,
  perks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (level, tier)
);

create table if not exists public.game_levels (
  id uuid primary key default gen_random_uuid(),
  level_name text not null check (level_name in ('Level', 'Grade', 'Class', 'Stage', 'Phase', 'Degree', 'Plane', 'Echelon', 'Tier')),
  level_order integer not null check (level_order between 1 and 10),
  game_level_levels jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  reward_type text not null default 'custom' check (reward_type in ('badge', 'digital', 'access', 'feature', 'merch', 'token', 'custom')),
  reward_order integer not null default 1 check (reward_order >= 1),
  points_cost integer not null default 0 check (points_cost >= 0),
  inventory_count integer check (inventory_count is null or inventory_count >= 0),
  status text not null default 'draft' check (status in ('active', 'draft', 'archived')),
  image_url text not null default '',
  redemption_url text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_scoring (
  id uuid primary key default gen_random_uuid(),
  score_name text not null,
  description text not null default '',
  specific_criteria text not null default '',
  points integer not null default 0 check (points >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_level_up_rules (
  id uuid primary key default gen_random_uuid(),
  level_name text not null check (level_name in ('Level', 'Grade', 'Class', 'Stage', 'Phase', 'Degree', 'Plane', 'Echelon', 'Tier')),
  sublevel_name text not null,
  criteria jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_progressive_features (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null unique,
  name text not null,
  description text not null default '',
  unlock_level_name text not null check (unlock_level_name in ('Level', 'Grade', 'Class', 'Stage', 'Phase', 'Degree', 'Plane', 'Echelon', 'Tier')),
  unlock_sublevel_name text not null default '',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_level_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  level_name text not null check (level_name in ('Level', 'Grade', 'Class', 'Stage', 'Phase', 'Degree', 'Plane', 'Echelon', 'Tier')),
  sublevel_name text not null default '',
  module_id uuid references public.builder_cell_modules(id) on delete set null,
  trigger text not null default 'game' check (trigger in ('game')),
  audience text not null default 'both' check (audience in ('public', 'portal', 'both')),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
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
alter table public.poll_response
add column if not exists user_id uuid;

alter table public.poll_response
add column if not exists tokens_earned integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'poll_response_user_id_fkey'
  ) then
    alter table public.poll_response
    add constraint poll_response_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete set null;
  end if;
end $$;

create index if not exists poll_response_poll_id_idx on public.poll_response (poll_id);
create index if not exists poll_response_session_id_idx on public.poll_response (session_id);
create index if not exists poll_response_user_id_idx on public.poll_response (user_id);
create index if not exists poll_reaction_user_id_idx on public.poll_reaction (user_id);
create index if not exists poll_reaction_poll_id_idx on public.poll_reaction (poll_id);
create index if not exists poll_reaction_updated_at_idx on public.poll_reaction (updated_at desc);
create unique index if not exists poll_response_anonymous_session_poll_unique_idx
on public.poll_response (session_id, poll_id)
where user_id is null;
create unique index if not exists poll_response_user_poll_unique_idx
on public.poll_response (user_id, poll_id)
where user_id is not null;
create index if not exists poll_options_poll_id_idx on public.poll_options (poll_id);
create index if not exists page_templates_updated_at_idx on public.page_templates (updated_at desc);
create index if not exists page_templates_email_function_idx
  on public.page_templates (email_function)
  where template_kind = 'email';
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
create index if not exists game_levels_level_name_idx on public.game_levels (level_name);
create index if not exists game_levels_updated_at_idx on public.game_levels (updated_at desc);
create index if not exists game_level_tiers_level_sort_idx on public.game_level_tiers (level, sort_order);
create index if not exists game_level_tiers_points_required_idx on public.game_level_tiers (points_required);
create index if not exists game_rewards_status_points_idx on public.game_rewards (status, points_cost);
create index if not exists game_rewards_order_idx on public.game_rewards (reward_order, name);
create index if not exists game_rewards_updated_at_idx on public.game_rewards (updated_at desc);
create index if not exists game_scoring_points_idx on public.game_scoring (points);
create index if not exists game_scoring_updated_at_idx on public.game_scoring (updated_at desc);
create index if not exists game_level_up_rules_target_idx on public.game_level_up_rules (level_name, sublevel_name);
create index if not exists game_level_up_rules_updated_at_idx on public.game_level_up_rules (updated_at desc);
create index if not exists game_progressive_features_unlock_idx on public.game_progressive_features (unlock_level_name, unlock_sublevel_name);
create index if not exists game_progressive_features_updated_at_idx on public.game_progressive_features (updated_at desc);
create index if not exists game_level_events_target_idx on public.game_level_events (level_name, sublevel_name);
create index if not exists game_level_events_module_idx on public.game_level_events (module_id);
create index if not exists game_level_events_updated_at_idx on public.game_level_events (updated_at desc);
create unique index if not exists blog_topics_slug_unique_idx on public.blog_topics (slug);
create unique index if not exists blog_tags_slug_unique_idx on public.blog_tags (slug);
create unique index if not exists blog_categories_slug_unique_idx on public.blog_categories (slug);
create index if not exists polls_category_id_idx on public.polls (category_id);
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
alter table public.poll_categories enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_response enable row level security;
alter table public.poll_reaction enable row level security;
alter table public.player_profiles enable row level security;
alter table public.poll_settings enable row level security;
alter table public.page_templates enable row level security;
alter table public.pages enable row level security;
alter table public.users enable row level security;
alter table public.team_users enable row level security;
alter table public.builder_cell_modules enable row level security;
alter table public.builder_saved_sections enable row level security;
alter table public.products enable row level security;
alter table public.game_levels enable row level security;
alter table public.game_level_tiers enable row level security;
alter table public.game_rewards enable row level security;
alter table public.game_scoring enable row level security;
alter table public.game_level_up_rules enable row level security;
alter table public.game_progressive_features enable row level security;
alter table public.game_level_events enable row level security;
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

drop policy if exists "poll categories are readable" on public.poll_categories;
create policy "poll categories are readable"
on public.poll_categories
for select
to anon, authenticated
using (true);

-- Public read: published polls
drop policy if exists "published polls are readable" on public.polls;
create policy "published polls are readable"
on public.polls
for select
to anon, authenticated
using (is_published = true and is_hidden = false);

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
      and public.polls.is_hidden = false
  )
);

drop policy if exists "poll_response rows are readable for published polls" on public.poll_response;
create policy "poll_response rows are readable for published polls"
on public.poll_response
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.polls
    where public.polls.id = public.poll_response.poll_id
      and public.polls.is_published = true
      and public.polls.is_hidden = false
  )
);

drop policy if exists "anon can insert poll_response for published polls" on public.poll_response;
create policy "anon can insert poll_response for published polls"
on public.poll_response
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.polls
    where public.polls.id = poll_id
      and public.polls.is_published = true
      and public.polls.is_hidden = false
  )
  and exists (
    select 1
    from public.poll_options
    where public.poll_options.id = option_id
      and public.poll_options.poll_id = poll_id
  )
);

drop policy if exists "poll reactions are readable for published polls" on public.poll_reaction;
create policy "poll reactions are readable for published polls"
on public.poll_reaction
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.polls
    where public.polls.id = public.poll_reaction.poll_id
      and public.polls.is_published = true
      and public.polls.is_hidden = false
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
grant select, insert, update on public.poll_response to anon, authenticated, service_role;
grant select on public.poll_reaction to anon, authenticated, service_role;
grant insert, update, delete on public.poll_reaction to service_role;

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

drop policy if exists "game level tiers are readable" on public.game_level_tiers;
create policy "game level tiers are readable"
on public.game_level_tiers
for select
to anon, authenticated
using (true);

drop policy if exists "game levels are readable" on public.game_levels;
create policy "game levels are readable"
on public.game_levels
for select
to anon, authenticated
using (true);

drop policy if exists "active game rewards are readable" on public.game_rewards;
create policy "active game rewards are readable"
on public.game_rewards
for select
to anon, authenticated
using (status = 'active');

drop policy if exists "game scoring rules are readable" on public.game_scoring;
create policy "game scoring rules are readable"
on public.game_scoring
for select
to anon, authenticated
using (true);

drop policy if exists "game level up rules are readable" on public.game_level_up_rules;
create policy "game level up rules are readable"
on public.game_level_up_rules
for select
to anon, authenticated
using (true);

drop policy if exists "game progressive features are readable" on public.game_progressive_features;
create policy "game progressive features are readable"
on public.game_progressive_features
for select
to anon, authenticated
using (true);

drop policy if exists "game level events are readable" on public.game_level_events;
create policy "game level events are readable"
on public.game_level_events
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

grant select on public.game_level_tiers to anon, authenticated, service_role;
grant select on public.game_levels to anon, authenticated, service_role;
grant select on public.game_rewards to anon, authenticated, service_role;
grant select on public.game_scoring to anon, authenticated, service_role;
grant select on public.game_level_up_rules to anon, authenticated, service_role;
grant select on public.game_progressive_features to anon, authenticated, service_role;
grant select on public.game_level_events to anon, authenticated, service_role;
grant insert, update, delete on public.game_level_tiers to service_role;
grant insert, update, delete on public.game_levels to service_role;
grant insert, update, delete on public.game_rewards to service_role;
grant insert, update, delete on public.game_scoring to service_role;
grant insert, update, delete on public.game_level_up_rules to service_role;
grant insert, update, delete on public.game_progressive_features to service_role;
grant insert, update, delete on public.game_level_events to service_role;

insert into public.game_level_tiers (level, tier, name, points_required, sort_order, perks)
values
  (1, 'Bronze', 'First Signal', 0, 10, '["Start earning points from poll answers"]'::jsonb),
  (1, 'Silver', 'Pattern Spotter', 25, 20, '["Unlock early engagement experiments"]'::jsonb),
  (1, 'Gold', 'Culture Mapper', 100, 30, '["Qualify for featured reward drops"]'::jsonb)
on conflict (level, tier) do nothing;

-- Seed the default track only when the table is empty (the original
-- on conflict (level_order) form broke after migration 023 dropped that
-- unique constraint).
insert into public.game_levels (level_name, level_order, game_level_levels)
select
  'Level',
  1,
  '[{"name":"Apprentice","order":1},{"name":"Acolyte","order":2},{"name":"Wizard","order":3}]'::jsonb
where not exists (select 1 from public.game_levels);

insert into public.game_scoring (score_name, description, specific_criteria, points)
values
  ('Poll answer', 'Awarded when a signed-in player answers a poll.', 'Player must submit one valid answer to a published poll they have not already answered.', 1),
  ('Poll Like', 'Awarded when a signed-in player likes a poll they already answered.', 'Player must react with Like on a previous poll in the results panel.', 2),
  ('Poll Dislike', 'Awarded when a signed-in player dislikes a poll they already answered.', 'Player must react with Dislike on a previous poll in the results panel.', 2)
on conflict do nothing;

insert into public.game_progressive_features (feature_key, name, description, unlock_level_name, unlock_sublevel_name, is_active, metadata)
values
  (
    'poll_skip',
    'Skip Poll',
    'Allows qualified players to skip the current poll and move to the next one.',
    'Level',
    '1',
    true,
    '{"uiPlacement":"under_poll_options"}'::jsonb
  ),
  (
    'poll_like_dislike',
    'Like and Dislike',
    'Shows Like and Dislike controls on previous poll results so players can react and earn points.',
    'Level',
    '2',
    true,
    '{"uiPlacement":"previous_results_corners"}'::jsonb
  )
on conflict (feature_key) do nothing;

insert into public.game_level_events (event_name, level_name, sublevel_name, module_id, trigger, is_active, metadata)
select
  'Level 1.1 Confetti',
  'Level',
  '1',
  candidate.id,
  'game',
  true,
  '{"eventType":"confetti"}'::jsonb
from (
  select builder_cell_modules.id
  from public.builder_cell_modules
  where exists (
    select 1
    from jsonb_array_elements(builder_cell_modules.modules) as module
    where module->>'type' = 'confetti'
      and coalesce(module->'settings'->>'trigger', '') = 'game'
  )
  order by builder_cell_modules.updated_at desc
  limit 1
) as candidate
where not exists (
  select 1 from public.game_level_events where event_name = 'Level 1.1 Confetti'
);

-- ---------------------------------------------------------------------------
-- Gallery media, game reminders, and interstitials
-- (consolidated from migrations 037/040/042/044/046/047/054/055; kept
-- verbatim so schema.sql stays an equivalent install script)
-- ---------------------------------------------------------------------------

-- from 037_game_reminders.sql
-- Player reminders: popup or inline notices triggered by game criteria.

create table if not exists public.game_reminders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_type text not null default 'popup' check (display_type in ('popup', 'inline')),
  message_html text not null default '',
  criterion_type text not null check (criterion_type in ('polls_taken', 'logins', 'specific_poll', 'registered')),
  criterion_value jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_reminders_active_sort_idx
on public.game_reminders (is_active, sort_order);

create index if not exists game_reminders_updated_at_idx
on public.game_reminders (updated_at desc);

alter table public.game_reminders enable row level security;

drop policy if exists "game reminders are readable" on public.game_reminders;
create policy "game reminders are readable"
on public.game_reminders
for select
to anon, authenticated
using (true);

grant select on public.game_reminders to anon, authenticated, service_role;
grant insert, update, delete on public.game_reminders to service_role;

-- from 040_gallery_media_badge.sql
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

-- from 042_gallery_media_list_indexes.sql
-- Indexes for filtered, sorted gallery media library queries.

create index if not exists gallery_media_created_at_idx
on public.gallery_media (created_at desc);

create index if not exists gallery_media_storage_name_idx
on public.gallery_media (storage_name);

create index if not exists gallery_media_badge_storage_name_idx
on public.gallery_media (badge, storage_name);

-- from 044_game_reminder_appearance.sql
-- Reminder presentation: speech bubble overlay or top/bottom strip.

alter table public.game_reminders
add column if not exists appearance text;

update public.game_reminders
set appearance = case
  when coalesce(display_type, 'popup') = 'inline' then 'strip'
  else 'speech_bubble'
end
where appearance is null or trim(appearance) = '';

alter table public.game_reminders
alter column appearance set default 'speech_bubble';

alter table public.game_reminders
alter column appearance set not null;

alter table public.game_reminders
drop constraint if exists game_reminders_appearance_check;

alter table public.game_reminders
add constraint game_reminders_appearance_check
check (appearance in ('speech_bubble', 'strip'));

-- from 046_gallery_media_category_type.sql
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

-- from 047_gallery_media_aspect.sql
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

-- from 054_game_interstitials.sql
-- Poll interstitials: messages shown in the main polling panel between polls.

create table if not exists public.game_interstitials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  interstitial_type text not null default 'custom' check (
    interstitial_type in (
      'ad',
      'instructions',
      'special_deal',
      'feedback_poll',
      'announcement',
      'milestone',
      'survey',
      'partner_promo',
      'referral',
      'content_teaser',
      'onboarding',
      'custom'
    )
  ),
  display_order integer not null default 1 check (display_order >= 1),
  status text not null default 'draft' check (status in ('active', 'draft', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_interstitials_display_order_idx
on public.game_interstitials (display_order);

create index if not exists game_interstitials_status_idx
on public.game_interstitials (status);

create index if not exists game_interstitials_updated_at_idx
on public.game_interstitials (updated_at desc);

alter table public.game_interstitials enable row level security;

drop policy if exists "game interstitials are readable" on public.game_interstitials;
create policy "game interstitials are readable"
on public.game_interstitials
for select
to anon, authenticated
using (true);

grant select on public.game_interstitials to anon, authenticated, service_role;
grant insert, update, delete on public.game_interstitials to service_role;

notify pgrst, 'reload schema';

-- from 055_game_interstitial_survey_responses.sql
-- Survey interstitial responses: one submission per interstitial per player or session.

create table if not exists public.game_interstitial_responses (
  id uuid primary key default gen_random_uuid(),
  interstitial_id uuid not null references public.game_interstitials(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  session_id text not null default '',
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists game_interstitial_responses_interstitial_idx
on public.game_interstitial_responses (interstitial_id);

create index if not exists game_interstitial_responses_user_idx
on public.game_interstitial_responses (user_id)
where user_id is not null;

create index if not exists game_interstitial_responses_session_idx
on public.game_interstitial_responses (session_id)
where session_id <> '';

create unique index if not exists game_interstitial_responses_user_unique
on public.game_interstitial_responses (interstitial_id, user_id)
where user_id is not null;

create unique index if not exists game_interstitial_responses_session_unique
on public.game_interstitial_responses (interstitial_id, session_id)
where user_id is null and session_id <> '';

alter table public.game_interstitial_responses enable row level security;

drop policy if exists "game interstitial responses are readable" on public.game_interstitial_responses;
create policy "game interstitial responses are readable"
on public.game_interstitial_responses
for select
to anon, authenticated
using (true);

grant select on public.game_interstitial_responses to anon, authenticated, service_role;
grant insert, update, delete on public.game_interstitial_responses to service_role;

notify pgrst, 'reload schema';


-- from later column migrations (038/041/043/051), kept verbatim

-- from 038_player_login_count.sql
-- Track player login count for game reminder criteria.

alter table public.player_profiles
add column if not exists login_count integer not null default 0 check (login_count >= 0);

create index if not exists player_profiles_login_count_idx
on public.player_profiles (login_count);

-- from 041_poll_response_skipped.sql
-- Track skipped polls separately from real answers (no points, excluded from vote totals).

alter table public.poll_response
add column if not exists is_skipped boolean not null default false;

create index if not exists poll_response_skipped_idx
on public.poll_response (poll_id, is_skipped)
where is_skipped = true;

-- from 043_game_audience.sql
-- Audience controls where game events and reminders may fire (public site, portal, or both).

alter table if exists public.game_level_events
add column if not exists audience text not null default 'both';

alter table if exists public.game_level_events
drop constraint if exists game_level_events_audience_check;

alter table if exists public.game_level_events
add constraint game_level_events_audience_check
check (audience in ('public', 'portal', 'both'));

alter table if exists public.game_reminders
add column if not exists audience text not null default 'both';

alter table if exists public.game_reminders
drop constraint if exists game_reminders_audience_check;

alter table if exists public.game_reminders
add constraint game_reminders_audience_check
check (audience in ('public', 'portal', 'both'));

-- from 051_player_crypto_wallets.sql
alter table public.player_profiles
add column if not exists crypto_wallets jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';


-- Deferred FK: polls is created before blog_posts in this file, so the
-- constraint is attached after both tables exist (idempotent for replays).
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'polls_deep_dive_blog_post_id_fkey') then
    alter table public.polls
    add constraint polls_deep_dive_blog_post_id_fkey
    foreign key (deep_dive_blog_post_id) references public.blog_posts(id) on delete set null;
  end if;
end $$;


-- Player Portal schema (idempotent — safe to run in Supabase SQL Editor)
-- Split across numbered migrations as:
--   supabase/migrations/005_player_portal.sql
--   supabase/migrations/013_player_profile_details.sql

-- ---------------------------------------------------------------------------
-- player_profiles
-- ---------------------------------------------------------------------------
create table if not exists public.player_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  handle text not null,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (handle)
);

-- Profile page fields (migration 013)
alter table public.player_profiles
add column if not exists avatar_url text,
add column if not exists bio text not null default '',
add column if not exists social_links jsonb not null default '{}'::jsonb,
add column if not exists share_profile boolean not null default false,
add column if not exists share_poll_responses boolean not null default false;

-- Preferences (migration 014)
alter table public.player_profiles
add column if not exists preferred_poll_categories jsonb not null default '[]'::jsonb,
add column if not exists default_play_poll_category text;

alter table public.player_profiles
add column if not exists is_tester boolean not null default false,
add column if not exists tester_poll_id uuid references public.polls(id) on delete set null;

create index if not exists player_profiles_tester_poll_id_idx
on public.player_profiles (tester_poll_id)
where is_tester = true;

create index if not exists player_profiles_status_idx on public.player_profiles (status);
create index if not exists player_profiles_handle_idx on public.player_profiles (handle);

alter table public.player_profiles enable row level security;

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

drop policy if exists "players can update own profile" on public.player_profiles;
create policy "players can update own profile"
on public.player_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

grant select, insert, update on public.player_profiles to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Link poll responses to authenticated players
-- ---------------------------------------------------------------------------
alter table public.poll_response
add column if not exists user_id uuid;

alter table public.poll_response
add column if not exists tokens_earned integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'poll_response_user_id_fkey'
  ) then
    alter table public.poll_response
    add constraint poll_response_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete set null;
  end if;
end $$;

create index if not exists poll_response_user_id_idx on public.poll_response (user_id);

create unique index if not exists poll_response_user_poll_unique_idx
on public.poll_response (user_id, poll_id)
where user_id is not null;

grant select, insert, update on public.poll_response to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- Local storage bucket used by the gallery (exists in production already).
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;
