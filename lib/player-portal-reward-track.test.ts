import { describe, expect, it } from "vitest";
import {
  buildRewardTrack,
  PLAYER_GRADES_PER_CLASS,
  PLAYER_LEVELS_PER_GRADE,
  PLAYER_POLLS_PER_CLASS,
  PLAYER_POLLS_PER_GRADE,
  PLAYER_POLLS_PER_LEVEL,
  PLAYER_PORTAL_CLASS_COIN_SIZE_PX,
  PLAYER_PORTAL_GRADE_COIN_SIZE_PX,
  PLAYER_PORTAL_LEVEL_COIN_SIZE_PX
} from "@/lib/player-portal";

type RewardRow = {
  name: string | null;
  reward_order: number | null;
  points_cost: number | null;
  metadata: Record<string, unknown>;
  updated_at: string | null;
};

function levelRewardSizeForTier(levelTier: number) {
  if (levelTier === 2) {
    return `${PLAYER_PORTAL_GRADE_COIN_SIZE_PX}px`;
  }

  if (levelTier === 3) {
    return `${PLAYER_PORTAL_CLASS_COIN_SIZE_PX}px`;
  }

  return `${PLAYER_PORTAL_LEVEL_COIN_SIZE_PX}px`;
}

function rewardForTier(gradeTier: number, levelTier: number, classTier = 1): RewardRow {
  const levelColor =
    gradeTier === 1 ? "#d8212d" : gradeTier === 2 ? "#ff6600" : gradeTier === 3 ? "#cc9900" : "#d8212d";

  return {
    name: `Class ${classTier} Grade ${gradeTier} Level ${levelTier}`,
    reward_order: levelTier,
    points_cost: 0,
    updated_at: null,
    metadata: {
      gradeTier,
      classTier,
      levelTier,
      pollReward: { visualType: "coin", visualColor: levelColor, visualSize: "20px" },
      levelReward: {
        visualType: "coin",
        visualColor: levelColor,
        visualSize: levelRewardSizeForTier(levelTier)
      }
    }
  };
}

function buildFixtureRewards(maxGrade: number, classTier = 1) {
  const rewards: RewardRow[] = [];

  for (let gradeTier = 1; gradeTier <= maxGrade; gradeTier += 1) {
    for (let levelTier = 1; levelTier <= PLAYER_LEVELS_PER_GRADE; levelTier += 1) {
      rewards.push(rewardForTier(gradeTier, levelTier, classTier));
    }
  }

  return rewards;
}

describe("buildRewardTrack", () => {
  const rewards = buildFixtureRewards(3);

  it("stacks only the current grade level coins while progressing grade 1", () => {
    const track = buildRewardTrack(rewards, 35);

    expect(track.currentClass).toBe(1);
    expect(track.currentGrade).toBe(1);
    expect(track.completedClassCoins).toHaveLength(0);
    expect(track.completedGradeCoins).toHaveLength(0);
    expect(track.completedLevelRewardsInGrade).toHaveLength(3);
    expect(track.completedLevelRewardsInGrade.every((visual) => visual.visualSize === "30px")).toBe(true);
    expect(track.earnedSlots).toBe(5);
    expect(track.totalSlots).toBe(PLAYER_POLLS_PER_LEVEL);
  });

  it("uses the first 60px level-level row in rewards succession for the first grade coin", () => {
    const mixedRewards = buildFixtureRewards(2).map((reward) => {
      const gradeTier = Number(reward.metadata.gradeTier);
      const levelTier = Number(reward.metadata.levelTier);

      if (gradeTier === 1 && levelTier === 2) {
        return {
          ...reward,
          metadata: {
            ...reward.metadata,
            levelReward: {
              visualType: "coin",
              visualColor: "#d8212d",
              visualSize: "30px"
            }
          }
        };
      }

      if (gradeTier !== 2 || levelTier !== 1) {
        return reward;
      }

      return {
        ...reward,
        metadata: {
          ...reward.metadata,
          levelReward: {
            visualType: "coin",
            visualColor: "#b80000",
            visualSize: "60px"
          }
        }
      };
    });
    const track = buildRewardTrack(mixedRewards, 100);

    expect(track.completedGradeCoins[0]?.visualColor).toBe("#b80000");
    expect(track.completedGradeCoins[0]?.visualSize).toBe("60px");
  });

  it("at 100 polls replaces level stacks with one grade 1 coin", () => {
    const track = buildRewardTrack(rewards, 100);

    expect(track.completedGrades).toBe(1);
    expect(track.currentGrade).toBe(2);
    expect(track.completedGradeCoins).toHaveLength(1);
    expect(track.completedGradeCoins[0]?.visualColor).toBe("#d8212d");
    expect(track.completedGradeCoins[0]?.visualSize).toBe("60px");
    expect(track.completedLevelRewardsInGrade).toHaveLength(0);
    expect(track.earnedSlots).toBe(0);
  });

  it("shows grade coins plus the next grade level stack after starting grade 2", () => {
    const track = buildRewardTrack(rewards, PLAYER_POLLS_PER_GRADE + 25);

    expect(track.completedGradeCoins).toHaveLength(1);
    expect(track.completedGradeCoins[0]?.visualSize).toBe("60px");
    expect(track.completedLevelRewardsInGrade).toHaveLength(2);
    expect(track.completedLevelRewardsInGrade.every((visual) => visual.visualSize === "30px")).toBe(true);
    expect(track.currentGrade).toBe(2);
    expect(track.earnedSlots).toBe(5);
  });

  it("at 110 polls shows one grade coin and one stacked level coin", () => {
    const track = buildRewardTrack(rewards, 110);

    expect(track.currentGrade).toBe(2);
    expect(track.currentLevel).toBe(2);
    expect(track.completedGradeCoins).toHaveLength(1);
    expect(track.completedLevelRewardsInGrade).toHaveLength(1);
    expect(track.earnedSlots).toBe(0);
    expect(track.completedGradeCoins[0]?.visualSize).toBe("60px");
    expect(track.completedLevelRewardsInGrade[0]?.visualSize).toBe("30px");
  });

  it("uses level-level color for stacked coins when level-level is not 30px", () => {
    const rewards = buildFixtureRewards(2).map((reward) => {
      if (Number(reward.metadata.gradeTier) !== 2 || Number(reward.metadata.levelTier) !== 1) {
        return reward;
      }

      return {
        ...reward,
        metadata: {
          ...reward.metadata,
          pollReward: {
            visualType: "coin",
            visualColor: "#f9cdd0",
            visualSize: "30px"
          },
          levelReward: {
            visualType: "coin",
            visualColor: "#000dbd",
            visualSize: "60px"
          }
        }
      };
    });
    const track = buildRewardTrack(rewards, 110);

    expect(track.completedLevelRewardsInGrade[0]?.visualColor).toBe("#000dbd");
    expect(track.completedLevelRewardsInGrade[0]?.visualSize).toBe("30px");
  });

  it("at 120 polls stacks each completed level using that level level-level color at 30px", () => {
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
          pollReward: {
            visualType: "coin",
            visualColor: levelColor,
            visualSize: "20px"
          },
          levelReward: {
            visualType: "coin",
            visualColor: levelColor,
            visualSize: levelRewardSizeForTier(levelTier)
          }
        }
      };
    });
    const track = buildRewardTrack(gradeTwoRewards, 120);

    expect(track.completedLevelRewardsInGrade).toHaveLength(2);
    expect(track.completedLevelRewardsInGrade[0]?.visualColor).toBe("#b83a00");
    expect(track.completedLevelRewardsInGrade[1]?.visualColor).toBe("#7a2800");
    expect(track.completedLevelRewardsInGrade.every((visual) => visual.visualSize === "30px")).toBe(true);
  });

  it("at 200 polls uses the first and second 60px rows in grade-level succession", () => {
    const customRewards = buildFixtureRewards(4).map((reward) => {
      const gradeTier = Number(reward.metadata.gradeTier);
      const levelTier = Number(reward.metadata.levelTier);

      if (gradeTier === 1 && levelTier === 2) {
        return {
          ...reward,
          metadata: {
            ...reward.metadata,
            levelReward: {
              visualType: "coin",
              visualColor: "#d8212d",
              visualSize: "30px"
            }
          }
        };
      }

      if (gradeTier === 2 && levelTier === 1) {
        return {
          ...reward,
          metadata: {
            ...reward.metadata,
            levelReward: {
              visualType: "coin",
              visualColor: "#cc0000",
              visualSize: "60px",
              visualSymbolUrl: "https://cdn.example.com/g1-grade.png"
            }
          }
        };
      }

      if (gradeTier === 2 && levelTier === 2) {
        return {
          ...reward,
          metadata: {
            ...reward.metadata,
            levelReward: {
              visualType: "coin",
              visualColor: "#ff9900",
              visualSize: "60px",
              visualSymbolUrl: "https://cdn.example.com/g2-grade.png"
            }
          }
        };
      }

      if (gradeTier === 3 && levelTier === 1) {
        return {
          ...reward,
          metadata: {
            ...reward.metadata,
            levelReward: {
              visualType: "coin",
              visualColor: "#b19bc0",
              visualSize: "60px"
            }
          }
        };
      }

      return reward;
    });

    const track = buildRewardTrack(customRewards, 200);

    expect(track.completedGradeCoins).toHaveLength(2);
    expect(track.completedGradeCoins[0]?.visualColor).toBe("#cc0000");
    expect(track.completedGradeCoins[1]?.visualColor).toBe("#ff9900");
    expect(track.completedGradeCoins.every((visual) => visual.visualSize === "60px")).toBe(true);
    expect(track.completedGradeCoins[0]?.visualSymbolUrl).toBe("https://cdn.example.com/g1-grade.png");
    expect(track.completedGradeCoins[1]?.visualSymbolUrl).toBe("https://cdn.example.com/g2-grade.png");
  });

  it("carries symbol URLs into grade coins and stacked level coins separately", () => {
    const symbolRewards = buildFixtureRewards(2).map((reward) => {
      const gradeTier = Number(reward.metadata.gradeTier);
      const levelTier = Number(reward.metadata.levelTier);

      if (gradeTier === 1 && levelTier === 2) {
        return {
          ...reward,
          metadata: {
            ...reward.metadata,
            levelReward: {
              visualType: "coin",
              visualColor: "#d8212d",
              visualSize: "30px"
            }
          }
        };
      }

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
            visualSize:
              gradeTier === 2 && levelTier === 1
                ? "60px"
                : levelRewardSizeForTier(levelTier),
            visualSymbolUrl:
              gradeTier === 2 && levelTier === 1
                ? "https://cdn.example.com/grade-1-graduation.png"
                : `https://cdn.example.com/grade-${gradeTier}-level-${levelTier}.png`
          }
        }
      };
    });
    const track = buildRewardTrack(symbolRewards, 120);

    expect(track.completedGradeCoins[0]?.visualSymbolUrl).toBe("https://cdn.example.com/grade-1-graduation.png");
    expect(track.completedLevelRewardsInGrade[0]?.visualSymbolUrl).toBe(
      "https://cdn.example.com/grade-1-graduation.png"
    );
    expect(track.completedLevelRewardsInGrade[1]?.visualSymbolUrl).toBe(
      "https://cdn.example.com/grade-2-level-2.png"
    );
  });

  it("adds a second grade coin after completing grade 2", () => {
    const track = buildRewardTrack(rewards, PLAYER_POLLS_PER_GRADE * 2);

    expect(track.completedGradeCoins).toHaveLength(2);
    expect(track.completedGradeCoins.every((visual) => visual.visualSize === "60px")).toBe(true);
    expect(track.currentGrade).toBe(3);
    expect(track.completedLevelRewardsInGrade).toHaveLength(0);
  });

  it("at 1000 polls shows one class coin and resets grade and level stacks", () => {
    const classRewards = [
      ...buildFixtureRewards(PLAYER_GRADES_PER_CLASS, 1),
      ...buildFixtureRewards(PLAYER_GRADES_PER_CLASS, 2)
    ];
    const track = buildRewardTrack(classRewards, PLAYER_POLLS_PER_CLASS);

    expect(track.completedClasses).toBe(1);
    expect(track.currentClass).toBe(2);
    expect(track.completedClassCoins).toHaveLength(1);
    expect(track.completedClassCoins[0]?.visualSize).toBe("90px");
    expect(track.completedGradeCoins).toHaveLength(0);
    expect(track.completedLevelRewardsInGrade).toHaveLength(0);
  });
});
