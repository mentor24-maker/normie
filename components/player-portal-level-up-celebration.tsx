"use client";

import { useEffect } from "react";
import type { PlayerPortalRewardTrack } from "@/lib/player-portal";
import { firePlayerLevelUpConfetti } from "@/lib/player-portal-confetti";

const LEVEL_UP_CHECK_STORAGE_KEY = "normie-player-level-up-check";

/** Call before refreshing portal data after a poll answer when a level-up is still possible. */
export function markPlayerLevelUpCheckPending(completedLevelRewards: number): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(LEVEL_UP_CHECK_STORAGE_KEY, String(completedLevelRewards));
}

type PlayerPortalLevelUpCelebrationProps = {
  rewardTrack: PlayerPortalRewardTrack;
};

/**
 * Renders nothing; fires confetti when the player completes a game sublevel
 * (reward track becomes complete) immediately after answering a poll.
 */
export function PlayerPortalLevelUpCelebration({ rewardTrack }: PlayerPortalLevelUpCelebrationProps) {
  useEffect(() => {
    const previousCompletedRewards = Number(sessionStorage.getItem(LEVEL_UP_CHECK_STORAGE_KEY));
    if (!Number.isFinite(previousCompletedRewards)) {
      return;
    }

    sessionStorage.removeItem(LEVEL_UP_CHECK_STORAGE_KEY);

    if (rewardTrack.completedLevelRewards > previousCompletedRewards) {
      firePlayerLevelUpConfetti();
    }
  }, [rewardTrack.completedLevelRewards, rewardTrack.levelName, rewardTrack.sublevelName]);

  return null;
}
