import type { AdminMediaItem } from "@/lib/admin-media";
import type { GameReward } from "@/lib/game-admin";
import { normalizeBuilderAssetUrl } from "@/lib/builder-template";

export type RewardSymbolOption = {
  value: string;
  label: string;
  group: "none" | "gallery" | "in-use";
};

function symbolFileName(url: string): string {
  const trimmed = url.trim();

  if (!trimmed) {
    return "";
  }

  try {
    return new URL(trimmed, "http://local").pathname.split("/").filter(Boolean).pop() ?? trimmed;
  } catch {
    return trimmed.split("/").filter(Boolean).pop() ?? trimmed;
  }
}

function collectRewardSymbolUrls(rewards: GameReward[]): string[] {
  const urls = new Set<string>();

  for (const reward of rewards) {
    for (const key of ["pollReward", "levelReward"] as const) {
      const nested = reward.metadata[key];

      if (nested && typeof nested === "object" && !Array.isArray(nested)) {
        const normalized = normalizeBuilderAssetUrl((nested as Record<string, unknown>).visualSymbolUrl);

        if (normalized) {
          urls.add(normalized);
        }
      }
    }
  }

  return [...urls].sort((left, right) => left.localeCompare(right));
}

export function buildRewardSymbolOptions(
  galleryMedia: AdminMediaItem[],
  rewards: GameReward[],
  currentValue = ""
): RewardSymbolOption[] {
  const seen = new Set<string>();
  const options: RewardSymbolOption[] = [];

  function addOption(value: string, label: string, group: RewardSymbolOption["group"]) {
    const normalized = normalizeBuilderAssetUrl(value);

    if (group !== "none" && (!normalized || seen.has(normalized))) {
      return;
    }

    if (normalized) {
      seen.add(normalized);
    }

    options.push({ value: normalized, label, group });
  }

  addOption("", "No Symbol", "none");

  for (const item of galleryMedia) {
    if (item.kind !== "image" || !item.badge) {
      continue;
    }

    addOption(item.path, item.name, "gallery");
  }

  for (const url of collectRewardSymbolUrls(rewards)) {
    addOption(url, symbolFileName(url), "in-use");
  }

  const normalizedCurrent = normalizeBuilderAssetUrl(currentValue);

  if (normalizedCurrent && !seen.has(normalizedCurrent)) {
    addOption(normalizedCurrent, symbolFileName(normalizedCurrent), "in-use");
  }

  return options;
}
