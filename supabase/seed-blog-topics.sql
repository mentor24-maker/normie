-- Seed blog topics (matches poll / headline rotator categories).
insert into public.blog_topics (name, slug)
values
  ('Identity & Psychology', 'identity-psychology'),
  ('Money & Success', 'money-success'),
  ('Dark / Truth', 'dark-truth'),
  ('Social & Relationships', 'social-relationships'),
  ('Life Tradeoffs', 'life-tradeoffs'),
  ('Future / Power', 'future-power'),
  ('Self-Perception', 'self-perception'),
  ('Behavior & Habits', 'behavior-habits'),
  ('Modern Life / Digital', 'modern-life-digital'),
  ('Absurd but Revealing', 'absurd-but-revealing')
on conflict (slug) do update
set
  name = excluded.name,
  updated_at = now();
