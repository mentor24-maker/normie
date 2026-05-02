insert into public.polls (question, order_index, is_published)
values
  ('How do you usually get your news?', 1, true),
  ('Which screen size feels best for reading long articles?', 2, true),
  ('What matters most when you try a new site?', 3, true);

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
