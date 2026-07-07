-- Grade 2 level-level disks: 40px; Grade 3 level-level disks: 80px.
-- Poll-level disks stay 20px for those grades.

update public.game_rewards
set
  metadata = jsonb_set(
    jsonb_set(
      coalesce(metadata, '{}'::jsonb),
      '{pollReward,visualSize}',
      '"20px"'::jsonb,
      true
    ),
    '{levelReward,visualSize}',
    '"40px"'::jsonb,
    true
  ),
  updated_at = now()
where coalesce((metadata->>'gradeTier')::int, 1) = 2;

update public.game_rewards
set
  metadata = jsonb_set(
    jsonb_set(
      coalesce(metadata, '{}'::jsonb),
      '{pollReward,visualSize}',
      '"20px"'::jsonb,
      true
    ),
    '{levelReward,visualSize}',
    '"80px"'::jsonb,
    true
  ),
  updated_at = now()
where coalesce((metadata->>'gradeTier')::int, 1) = 3;
