-- Allow badge rewards in the game reward catalog.

alter table if exists public.game_rewards
drop constraint if exists game_rewards_reward_type_check;

alter table if exists public.game_rewards
add constraint game_rewards_reward_type_check
check (reward_type in ('badge', 'digital', 'access', 'merch', 'token', 'custom'));
