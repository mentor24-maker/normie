-- Deep dive supplemental content: video, blog post, and manually related polls.

alter table public.polls
  add column if not exists deep_dive_youtube_url text not null default '',
  add column if not exists deep_dive_blog_post_id uuid references public.blog_posts(id) on delete set null,
  add column if not exists deep_dive_related_poll_ids jsonb not null default '[]'::jsonb;
