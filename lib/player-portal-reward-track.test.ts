import { describe, expect, it } from "vitest";
import {
  buildRewardTrack,
  PLAYER_LEVELS_PER_GRADE,
  PLAYER_POLLS_PER_GRADE,
  PLAYER_POLLS_PER_LEVEL
} from "@/lib/player-portal";

type RewardRow = {
  name: string | null;
  reward_order: number | null;
  points_cost: number | null;
  metadata: Record<string, unknown>;
  updated_at: string | null;
};

function rewardForTier(gradeTier: number, levelTier: number): RewardRow {
  return {
    name: `Grade ${gradeTier} Level ${levelTier}`,
    reward_order: levelTier,
    points_cost: 0,
    updated_at: null,
    metadata: {
      gradeTier,
      classTier: 1,
      levelTier,
      pollReward: { visualType: "coin", visualColor: "#d8212d", visualSize: "20px" },
      levelReward: {
        visualType: "coin",
        visualColor: "#d8212d",
        visualSize: gradeTier === 1 ? "42px" : gradeTier === 2 ? "30px" : "40px"
      }
    }
  };
}

function buildFixtureRewards(maxGrade: number) {
  const rewards: RewardRow[] = [];

  for (let gradeTier = 1; gradeTier <= maxGrade; gradeTier += 1) {
    for (let levelTier = 1; levelTier <= PLAYER_LEVELS_PER_GRADE; levelTier += 1) {
      rewards.push(rewardForTier(gradeTier, levelTier));
    }
  }

  return rewards;
}

describe("buildRewardTrack", () => {
  const rewards = buildFixtureRewards(3);

  it("stacks only the current grade level coins while progressing grade 1", () => {
    const track = buildRewardTrack(rewards, 35);

    expect(track.currentGrade).toBe(1);
    expect(track.completedGradeCoins).toHaveLength(0);
    expect(track.completedLevelRewardsInGrade).toHaveLength(3);
    expect(track.earnedSlots).toBe(5);
    expect(track.totalSlots).toBe(PLAYER_POLLS_PER_LEVEL);
  });

  it("uses previous grade level progression visual for completed grade coins", () => {
    const mixedRewards = buildFixtureRewards(2).map((reward) => {
      const gradeTier = Number(reward.metadata.gradeTier);
      const levelTier = Number(reward.metadata.levelTier);

      if (gradeTier !== 1 || levelTier !== 1) {
        return reward;
      }

      return {
        ...reward,
        metadata: {
          ...reward.metadata,
          levelReward: {
            visualType: "coin",
            visualColor: "#5acff9",
            visualSize: "42px"
          }
        }
      };
    });
    const track = buildRewardTrack(mixedRewards, 100);

    expect(track.completedGradeCoins[0]?.visualColor).toBe("#5acff9");
    expect(track.completedGradeCoins[0]?.visualSize).toBe("42px");
  });

  it("at 100 polls replaces level stacks with one grade 1 coin on refresh", () => {
    const track = buildRewardTrack(rewards, 100);

    expect(track.completedGrades).toBe(1);
    expect(track.currentGrade).toBe(2);
    expect(track.completedGradeCoins).toHaveLength(1);
    expect(track.completedGradeCoins[0]?.visualColor).toBe("#d8212d");
    expect(track.completedGradeCoins[0]?.visualSize).toBe("42px");
    expect(track.completedLevelRewardsInGrade).toHaveLength(0);
    expect(track.earnedSlots).toBe(0);
  });

  it("replaces grade 1 level stacks with one grade coin after graduating to grade 2", () => {
    const track = buildRewardTrack(rewards, PLAYER_POLLS_PER_GRADE);

    expect(track.completedGrades).toBe(1);
    expect(track.currentGrade).toBe(2);
    expect(track.completedGradeCoins).toHaveLength(1);
    expect(track.completedGradeCoins[0]?.visualSize).toBe("42px");
    expect(track.completedLevelRewardsInGrade).toHaveLength(0);
    expect(track.earnedSlots).toBe(0);
  });

  it("shows grade coins plus the next grade level stack after starting grade 2", () => {
    const track = buildRewardTrack(rewards, PLAYER_POLLS_PER_GRADE + 25);

    expect(track.completedGradeCoins).toHaveLength(1);
    expect(track.completedLevelRewardsInGrade).toHaveLength(2);
    expect(track.currentGrade).toBe(2);
    expect(track.earnedSlots).toBe(5);
  });

  it("at 110 polls shows one grade coin and one stacked level coin from levelReward", () => {
    const track = buildRewardTrack(rewards, 110);

    expect(track.currentGrade).toBe(2);
    expect(track.currentLevel).toBe(2);
    expect(track.completedGradeCoins).toHaveLength(1);
    expect(track.completedLevelRewardsInGrade).toHaveLength(1);
    expect(track.earnedSlots).toBe(0);
    expect(track.completedGradeCoins[0]?.visualSize).toBe("42px");
    expect(track.completedLevelRewardsInGrade[0]?.visualSize).toBe("30px");
  });

  it("at 120 polls stacks each completed level using that level levelReward color", () => {
    const gradeTwoRewards = buildFixtureRewards(2).map((reward) => {
      const levelTier = Number(reward.metadata.levelTier);
      const gradeTier = Number(reward.metadata.gradeTier);

      if (gradeTier !== 2) {
        return reward;
      }

      const levelColor = levelTier === 1 ? "#b83a00" : levelTier === 2 ? "#7a2800" : "#d8212d";

      return {
        ...reward,
        metadata: {
          ...reward.metadata,
          levelReward: {
            visualType: "coin",
            visualColor: levelColor,
            visualSize: "20px"
          }
        }
      };
    });
    const track = buildRewardTrack(gradeTwoRewards, 120);

    expect(track.completedLevelRewardsInGrade).toHaveLength(2);
    expect(track.completedLevelRewardsInGrade[0]?.visualColor).toBe("#b83a00");
    expect(track.completedLevelRewardsInGrade[1]?.visualColor).toBe("#7a2800");
    expect(track.completedLevelRewardsInGrade.every((visual) => visual.visualSize === "20px")).toBe(true);
  });

  it("at 200 polls uses previous grade level 1 then level 2 visuals for grade coins", () => {
    const customRewards = buildFixtureRewards(3).map((reward) => {
      const gradeTier = Number(reward.metadata.gradeTier);
      const levelTier = Number(reward.metadata.levelTier);

      if (gradeTier !== 2) {
        return reward;
      }

      const visualColor = levelTier === 1 ? "#cc0000" : levelTier === 2 ? "#ff9900" : "#d8212d";
      return {
        ...reward,
        metadata: {
          ...reward.metadata,
          levelReward: {
            visualType: "coin",
            visualColor,
            visualSize: "40px",
            visualSymbolUrl: `https://cdn.example.com/g2-l${levelTier}.png`
          }
        }
      };
    });

    const track = buildRewardTrack(customRewards, 200);

    expect(track.completedGradeCoins).toHaveLength(2);
    expect(track.completedGradeCoins[0]?.visualColor).toBe("#cc0000");
    expect(track.completedGradeCoins[1]?.visualColor).toBe("#ff9900");
    expect(track.completedGradeCoins[0]?.visualSize).toBe("40px");
    expect(track.completedGradeCoins[1]?.visualSize).toBe("40px");
    expect(track.completedGradeCoins[0]?.visualSymbolUrl).toBe("https://cdn.example.com/g2-l1.png");
    expect(track.completedGradeCoins[1]?.visualSymbolUrl).toBe("https://cdn.example.com/g2-l2.png");
  });

  it("carries symbol URLs into both grade coins and stacked level coins", () => {
    const symbolRewards = buildFixtureRewards(2).map((reward) => {
      const gradeTier = Number(reward.metadata.gradeTier);
      const levelTier = Number(reward.metadata.levelTier);

      return {
        ...reward,
        metadata: {
          ...reward.metadata,
          pollReward:
            gradeTier === 2
              ? {
                  visualType: "coin",
                  visualColor: "#d8212d",
                  visualSize: "20px",
                  visualSymbolUrl: `https://cdn.example.com/grade-2-level-${levelTier}.png`
                }
              : reward.metadata.pollReward,
          levelReward: {
            visualType: "coin",
            visualColor: "#d8212d",
            visualSize: "42px",
            visualSymbolUrl: `https://cdn.example.com/grade-${gradeTier}-coin.png`
          }
        }
      };
    });
    const track = buildRewardTrack(symbolRewards, 120);

    expect(track.completedGradeCoins[0]?.visualSymbolUrl).toBe("https://cdn.example.com/grade-1-coin.png");
    expect(track.completedLevelRewardsInGrade[0]?.visualSymbolUrl).toBe("https://cdn.example.com/grade-2-coin.png");
    expect(track.completedLevelRewardsInGrade[1]?.visualSymbolUrl).toBe("https://cdn.example.com/grade-2-coin.png");
  });

  it("adds a second grade coin after completing grade 2", () => {
    const track = buildRewardTrack(rewards, PLAYER_POLLS_PER_GRADE * 2);

    expect(track.completedGradeCoins).toHaveLength(2);
    expect(track.completedGradeCoins[1]?.visualSize).toBe("30px");
    expect(track.currentGrade).toBe(3);
    expect(track.completedLevelRewardsInGrade).toHaveLength(0);
  });
});
