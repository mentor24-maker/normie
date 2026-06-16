import { describe, expect, it } from "vitest";
import { PLAYER_POLLS_PER_GRADE } from "@/lib/player-portal";
import {
  getUnlockedFeatureKeys,
  pollsRequiredForRewardTier,
  POLL_LIKE_DISLIKE_FEATURE_KEY,
  POLL_SKIP_FEATURE_KEY
} from "@/lib/player-unlocked-features";

const progressiveFeatures = [
  { feature_key: POLL_SKIP_FEATURE_KEY, is_active: true },
  { feature_key: POLL_LIKE_DISLIKE_FEATURE_KEY, is_active: true }
];

describe("pollsRequiredForRewardTier", () => {
  it("maps grade 1 level 2 to 20 polls", () => {
    expect(pollsRequiredForRewardTier(1, 2)).toBe(20);
  });

  it("maps grade 2 level 1 to 110 polls", () => {
    expect(pollsRequiredForRewardTier(2, 1)).toBe(PLAYER_POLLS_PER_GRADE + 10);
  });
});

describe("getUnlockedFeatureKeys", () => {
  it("unlocks poll_skip from an active feature reward milestone", () => {
    const keys = getUnlockedFeatureKeys(
      20,
      [
        {
          reward_type: "feature",
          status: "active",
          metadata: { featureKey: POLL_SKIP_FEATURE_KEY, gradeTier: 1, levelTier: 2 }
        }
      ],
      progressiveFeatures
    );

    expect(keys).toEqual([POLL_SKIP_FEATURE_KEY]);
  });

  it("does not unlock before the reward tier milestone", () => {
    const keys = getUnlockedFeatureKeys(
      19,
      [
        {
          reward_type: "feature",
          status: "active",
          metadata: { featureKey: POLL_SKIP_FEATURE_KEY, gradeTier: 1, levelTier: 2 }
        }
      ],
      progressiveFeatures
    );

    expect(keys).toEqual([]);
  });

  it("unlocks poll_like_dislike from an active feature reward milestone", () => {
    const keys = getUnlockedFeatureKeys(
      20,
      [
        {
          reward_type: "feature",
          status: "active",
          metadata: { featureKey: POLL_LIKE_DISLIKE_FEATURE_KEY, gradeTier: 1, levelTier: 2 }
        }
      ],
      progressiveFeatures
    );

    expect(keys).toEqual([POLL_LIKE_DISLIKE_FEATURE_KEY]);
  });

  it("unlocks at grade 2 level 1 when configured for poll 110", () => {
    const keys = getUnlockedFeatureKeys(
      110,
      [
        {
          reward_type: "feature",
          status: "active",
          metadata: { featureKey: POLL_SKIP_FEATURE_KEY, gradeTier: 2, levelTier: 1 }
        }
      ],
      progressiveFeatures
    );

    expect(keys).toEqual([POLL_SKIP_FEATURE_KEY]);
  });
});
