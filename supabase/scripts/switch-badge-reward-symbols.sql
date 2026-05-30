-- Switch game reward badge symbol URLs to the gallery image marked badge = true.
--
-- Replaces pollReward.visualSymbolUrl and levelReward.visualSymbolUrl when the
-- stored filename matches *-icon_standard_200x200.png but is not already the
-- badge gallery file.
--
-- Run in Supabase SQL editor after 040_gallery_media_badge.sql.
-- Preview first:
--   SELECT id, name,
--          metadata->'pollReward'->>'visualSymbolUrl' AS poll_symbol,
--          metadata->'levelReward'->>'visualSymbolUrl' AS level_symbol
--   FROM public.game_rewards
--   WHERE coalesce(metadata->'pollReward'->>'visualSymbolUrl', '') ~ '-icon_standard_200x200\.png'
--      OR coalesce(metadata->'levelReward'->>'visualSymbolUrl', '') ~ '-icon_standard_200x200\.png';

with target as (
  select storage_name as file_name
  from public.gallery_media
  where badge = true
  order by updated_at desc
  limit 1
),
rewritten as (
  select
    gr.id,
    gr.metadata,
    t.file_name,
    case
      when coalesce(gr.metadata->'pollReward'->>'visualSymbolUrl', '') ~ '-icon_standard_200x200\.png'
       and coalesce(gr.metadata->'pollReward'->>'visualSymbolUrl', '') not like '%' || t.file_name || '%'
      then regexp_replace(
        gr.metadata->'pollReward'->>'visualSymbolUrl',
        '[^/]+-icon_standard_200x200\.png',
        t.file_name
      )
      else gr.metadata->'pollReward'->>'visualSymbolUrl'
    end as next_poll_symbol,
    case
      when coalesce(gr.metadata->'levelReward'->>'visualSymbolUrl', '') ~ '-icon_standard_200x200\.png'
       and coalesce(gr.metadata->'levelReward'->>'visualSymbolUrl', '') not like '%' || t.file_name || '%'
      then regexp_replace(
        gr.metadata->'levelReward'->>'visualSymbolUrl',
        '[^/]+-icon_standard_200x200\.png',
        t.file_name
      )
      else gr.metadata->'levelReward'->>'visualSymbolUrl'
    end as next_level_symbol
  from public.game_rewards gr
  cross join target t
)
update public.game_rewards gr
set
  metadata = jsonb_set(
    jsonb_set(
      coalesce(gr.metadata, '{}'::jsonb),
      '{pollReward,visualSymbolUrl}',
      to_jsonb(r.next_poll_symbol),
      true
    ),
    '{levelReward,visualSymbolUrl}',
    to_jsonb(r.next_level_symbol),
    true
  ),
  updated_at = now()
from rewritten r
where gr.id = r.id
  and (
    coalesce(gr.metadata->'pollReward'->>'visualSymbolUrl', '') is distinct from r.next_poll_symbol
    or coalesce(gr.metadata->'levelReward'->>'visualSymbolUrl', '') is distinct from r.next_level_symbol
  );
