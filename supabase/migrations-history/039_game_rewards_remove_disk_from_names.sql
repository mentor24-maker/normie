-- Remove the word "Disk" from game reward names (e.g. "Level 1: Red Disk" -> "Level 1: Red").

update public.game_rewards
set
  name = trim(regexp_replace(regexp_replace(name, '(?i)\mDisk\M', '', 'g'), '\s+', ' ', 'g')),
  updated_at = now()
where name ~* '\mdisk\M';
