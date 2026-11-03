-- Capitalize the first character of every poll answer button label (one-time fix after import).

update public.poll_options
set label = upper(left(label, 1)) || substring(label from 2)
where length(label) > 0
  and substring(label from 1 for 1) ~ '[a-z]';
