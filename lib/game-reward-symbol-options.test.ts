import { describe, expect, it } from "vitest";
import { buildRewardSymbolOptions } from "@/lib/game-reward-symbol-options";
import type { AdminMediaItem } from "@/lib/admin-media";
import type { GameReward } from "@/lib/game-admin";

const galleryMedia: AdminMediaItem[] = [
  {
    name: "wave.png",
    path: "/gallery/wave.png",
    directory: "gallery",
    kind: "image",
    extension: ".png",
    storageName: "wave.png",
    badge: true
  },
  {
    name: "hidden.png",
    path: "/gallery/hidden.png",
    directory: "gallery",
    kind: "image",
    extension: ".png",
    storageName: "hidden.png",
    badge: false
  }
];

const rewards: GameReward[] = [
  {
    id: "reward-1",
    name: "Level 1",
    description: "",
    rewardType: "badge",
    status: "published",
    pointsCost: 0,
    inventoryCount: null,
    rewardOrder: 1,
    metadata: {
      pollReward: {
        visualSymbolUrl: "/gallery/custom-badge.png"
      },
      levelReward: {
        visualSymbolUrl: "https://cdn.example.com/level-coin.png"
      }
    },
    updatedAt: "2026-01-01T00:00:00.000Z"
  }
];

describe("buildRewardSymbolOptions", () => {
  it("includes badge gallery images, in-use reward symbols, and the current value", () => {
    const options = buildRewardSymbolOptions(galleryMedia, rewards, "/gallery/extra.png");

    expect(options.map((option) => option.value)).toEqual([
      "",
      "/gallery/wave.png",
      "/gallery/custom-badge.png",
      "https://cdn.example.com/level-coin.png",
      "/gallery/extra.png"
    ]);
  });

  it("deduplicates gallery and reward symbols", () => {
    const duplicateRewards: GameReward[] = [
      {
        ...rewards[0],
        metadata: {
          pollReward: { visualSymbolUrl: "/gallery/wave.png" },
          levelReward: { visualSymbolUrl: "/gallery/wave.png" }
        }
      }
    ];

    const options = buildRewardSymbolOptions(galleryMedia, duplicateRewards);

    expect(options.filter((option) => option.value === "/gallery/wave.png")).toHaveLength(1);
  });
});
