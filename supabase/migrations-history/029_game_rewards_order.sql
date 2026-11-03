alter table if exists public.game_rewards
add column if not exists reward_order integer not null default 1 check (reward_order >= 1);

update public.game_rewards reward
set reward_order = parsed.order_value
from (
  select
    id,
    greatest(
      1,
      coalesce(
        nullif((regexp_match(name, '\blevel\s*([0-9]+)\b', 'i'))[1], '')::integer,
        case when metadata->>'rewardOrder' ~ '^[0-9]+$' then (metadata->>'rewardOrder')::integer end,
        case when metadata->>'levelOrder' ~ '^[0-9]+$' then (metadata->>'levelOrder')::integer end,
        case when metadata->>'achievementOrder' ~ '^[0-9]+$' then (metadata->>'achievementOrder')::integer end,
        reward_order
      )
    ) as order_value
  from public.game_rewards
) parsed
where reward.id = parsed.id;

create index if not exists game_rewards_order_idx
on public.game_rewards (reward_order, name);
