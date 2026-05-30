import {
  PLAYER_POLLS_PER_GRADE,
  PLAYER_POLLS_PER_LEVEL
} from "@/lib/player-portal";

export const POLL_SKIP_FEATURE_KEY = "poll_skip";

type FeatureRewardRow = {
  reward_type: string;
  status: string | null;
  metadata: unknown;
};

type ProgressiveFeatureRow = {
  feature_key: string;
  is_active: boolean | null;
};

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function getRewardTierValue(metadata: Record<string, unknown>, key: "levelTier" | "gradeTier" | "classTier"): number {
  const parsed = Number.parseInt(String(metadata[key] ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/** Poll count after which a grade/level tier feature reward is considered earned. */
export function pollsRequiredForRewardTier(gradeTier: number, levelTier: number): number {
  const grade = Math.max(1, gradeTier);
  const level = Math.max(1, levelTier);
  return (grade - 1) * PLAYER_POLLS_PER_GRADE + level * PLAYER_POLLS_PER_LEVEL;
}

export function isFeatureRewardUnlocked(
  reward: FeatureRewardRow,
  pollsTaken: number
): boolean {
  if (reward.reward_type !== "feature" || reward.status !== "active") {
    return false;
  }

  const metadata = toRecord(reward.metadata);
  const gradeTier = getRewardTierValue(metadata, "gradeTier");
  const levelTier = getRewardTierValue(metadata, "levelTier");

  return pollsTaken >= pollsRequiredForRewardTier(gradeTier, levelTier);
}

export function getUnlockedFeatureKeys(
  pollsTaken: number,
  rewards: FeatureRewardRow[],
  progressiveFeatures: ProgressiveFeatureRow[]
): string[] {
  const activeFeatureKeys = new Set(
    progressiveFeatures
      .filter((feature) => feature.is_active !== false)
      .map((feature) => String(feature.feature_key ?? "").trim())
      .filter(Boolean)
  );

  const unlocked = new Set<string>();

  for (const reward of rewards) {
    if (!isFeatureRewardUnlocked(reward, pollsTaken)) {
      continue;
    }

    const featureKey = String(toRecord(reward.metadata).featureKey ?? "").trim();

    if (!featureKey || !activeFeatureKeys.has(featureKey)) {
      continue;
    }

    unlocked.add(featureKey);
  }

  return [...unlocked].sort();
}

export function playerHasPollSkip(pollsTaken: number, rewards: FeatureRewardRow[], progressiveFeatures: ProgressiveFeatureRow[]): boolean {
  return getUnlockedFeatureKeys(pollsTaken, rewards, progressiveFeatures).includes(POLL_SKIP_FEATURE_KEY);
}
