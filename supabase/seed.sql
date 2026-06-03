insert into public.poll_categories (name, slug, sort_order)
values
  ('Media Habits', 'media-habits', 1000),
  ('Reading Preferences', 'reading-preferences', 1000),
  ('Product Experience', 'product-experience', 1000)
on conflict (slug) do update
set
  name = excluded.name,
  updated_at = now();

insert into public.polls (category_id, question, order_index, is_published)
values
  (
    (select id from public.poll_categories where slug = 'media-habits'),
    'How do you usually get your news?',
    1,
    true
  ),
  (
    (select id from public.poll_categories where slug = 'reading-preferences'),
    'Which screen size feels best for reading long articles?',
    2,
    true
  ),
  (
    (select id from public.poll_categories where slug = 'product-experience'),
    'What matters most when you try a new site?',
    3,
    true
  );

with ordered_polls as (
  select id, order_index from public.polls
)
insert into public.poll_options (poll_id, label, sort_order)
values
  ((select id from ordered_polls where order_index = 1), 'Social media', 1),
  ((select id from ordered_polls where order_index = 1), 'Podcasts', 2),
  ((select id from ordered_polls where order_index = 1), 'Traditional news sites', 3),
  ((select id from ordered_polls where order_index = 1), 'Friends or group chats', 4),
  ((select id from ordered_polls where order_index = 2), 'Phone', 1),
  ((select id from ordered_polls where order_index = 2), 'Tablet', 2),
  ((select id from ordered_polls where order_index = 2), 'Laptop', 3),
  ((select id from ordered_polls where order_index = 2), 'Desktop monitor', 4),
  ((select id from ordered_polls where order_index = 3), 'Speed', 1),
  ((select id from ordered_polls where order_index = 3), 'Clean design', 2),
  ((select id from ordered_polls where order_index = 3), 'Trustworthiness', 3),
  ((select id from ordered_polls where order_index = 3), 'Community participation', 4);
