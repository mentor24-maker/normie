/**
 * Switch every game reward badge symbol URL from legacy icon_standard uploads
 * to the gallery image marked badge = true in gallery_media.
 *
 * Usage:
 *   npx tsx scripts/switch-badge-reward-symbols.ts --dry-run
 *   npx tsx scripts/switch-badge-reward-symbols.ts
 *   npx tsx scripts/switch-badge-reward-symbols.ts --target=1780080401685-icon_standard_200x200.png
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getGalleryStorageName } from "../lib/gallery-media";
import { createAdminClient } from "../lib/supabase-admin";

const ICON_STANDARD_PATTERN = /-icon_standard_200x200\.png$/i;

type RewardRow = {
  id: string;
  name: string | null;
  metadata: Record<string, unknown> | null;
};

function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");

    for (const line of content.split("\n")) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separator = trimmed.indexOf("=");

      if (separator <= 0) {
        continue;
      }

      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local is optional when env vars are already exported.
  }
}

function getArgValue(prefix: string) {
  const match = process.argv.find((arg) => arg.startsWith(`${prefix}=`));
  return match ? match.slice(prefix.length + 1).trim() : "";
}

function shouldReplaceSymbolUrl(url: string, targetStorageName: string) {
  const storageName = getGalleryStorageName(url);

  if (!storageName || storageName === targetStorageName) {
    return false;
  }

  return ICON_STANDARD_PATTERN.test(storageName);
}

function rewriteRewardMetadata(
  metadata: Record<string, unknown>,
  targetUrl: string,
  targetStorageName: string
) {
  const nextMetadata = { ...metadata };
  let changed = false;

  for (const key of ["pollReward", "levelReward"] as const) {
    const nested =
      nextMetadata[key] && typeof nextMetadata[key] === "object" && !Array.isArray(nextMetadata[key])
        ? { ...(nextMetadata[key] as Record<string, unknown>) }
        : null;

    if (!nested) {
      continue;
    }

    const currentUrl = String(nested.visualSymbolUrl ?? "").trim();

    if (!shouldReplaceSymbolUrl(currentUrl, targetStorageName)) {
      continue;
    }

    nested.visualSymbolUrl = targetUrl;
    nextMetadata[key] = nested;
    changed = true;
  }

  return changed ? nextMetadata : null;
}

async function resolveTargetStorageName(supabase: ReturnType<typeof createAdminClient>) {
  const explicitTarget = getArgValue("--target");

  if (explicitTarget) {
    return explicitTarget;
  }

  const { data, error } = await supabase
    .from("gallery_media")
    .select("storage_name")
    .eq("badge", true)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  const storageName = data?.[0]?.storage_name;

  if (!storageName) {
    throw new Error("No gallery_media row with badge = true. Mark one image in Admin → Gallery first.");
  }

  return storageName;
}

async function main() {
  loadEnvLocal();

  const dryRun = process.argv.includes("--dry-run");
  const supabase = createAdminClient();
  const targetStorageName = await resolveTargetStorageName(supabase);
  const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(targetStorageName);
  const targetUrl = urlData.publicUrl;

  const { data: rewards, error: rewardsError } = await supabase
    .from("game_rewards")
    .select("id, name, metadata");

  if (rewardsError) {
    throw rewardsError;
  }

  let updatedCount = 0;

  for (const reward of (rewards ?? []) as RewardRow[]) {
    const metadata = reward.metadata ?? {};
    const nextMetadata = rewriteRewardMetadata(metadata, targetUrl, targetStorageName);

    if (!nextMetadata) {
      continue;
    }

    updatedCount += 1;

    const pollBefore = String((metadata.pollReward as Record<string, unknown> | undefined)?.visualSymbolUrl ?? "");
    const levelBefore = String((metadata.levelReward as Record<string, unknown> | undefined)?.visualSymbolUrl ?? "");
    const pollAfter = String((nextMetadata.pollReward as Record<string, unknown> | undefined)?.visualSymbolUrl ?? "");
    const levelAfter = String((nextMetadata.levelReward as Record<string, unknown> | undefined)?.visualSymbolUrl ?? "");

    console.log(`${dryRun ? "[dry-run] " : ""}${reward.name ?? reward.id}`);
    if (pollBefore !== pollAfter) {
      console.log(`  poll:  ${pollBefore} -> ${pollAfter}`);
    }
    if (levelBefore !== levelAfter) {
      console.log(`  level: ${levelBefore} -> ${levelAfter}`);
    }

    if (!dryRun) {
      const { error: updateError } = await supabase
        .from("game_rewards")
        .update({
          metadata: nextMetadata,
          updated_at: new Date().toISOString()
        })
        .eq("id", reward.id);

      if (updateError) {
        throw updateError;
      }
    }
  }

  console.log(
    `${dryRun ? "Would update" : "Updated"} ${updatedCount} reward${updatedCount === 1 ? "" : "s"} to ${targetStorageName}`
  );
  console.log(`Target URL: ${targetUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
