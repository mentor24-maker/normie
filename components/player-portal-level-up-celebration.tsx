"use client";

import { useEffect } from "react";
import type { PlayerPortalRewardTrack } from "@/lib/player-portal";
import { PLAYER_LEVEL_UP_INTERVAL, PLAYER_LEVEL_UP_PENDING_COOKIE } from "@/lib/player-level-up-event";
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
  pendingLevelUpCount?: number | null;
  rewardTrack: PlayerPortalRewardTrack;
};

/**
 * Renders nothing; fires confetti when the player completes a game sublevel
 * (reward track becomes complete) immediately after answering a poll.
 */
function clearPendingLevelUpCookie() {
  document.cookie = `${PLAYER_LEVEL_UP_PENDING_COOKIE}=; Max-Age=0; Path=/portal; SameSite=Lax`;
}

export function PlayerPortalLevelUpCelebration({
  pendingLevelUpCount,
  rewardTrack
}: PlayerPortalLevelUpCelebrationProps) {
  useEffect(() => {
    if (!pendingLevelUpCount) {
      return;
    }

    clearPendingLevelUpCookie();

    const completedCount = rewardTrack.completedLevelRewards * PLAYER_LEVEL_UP_INTERVAL;
    if (pendingLevelUpCount <= completedCount) {
      firePlayerLevelUpConfetti();
    }
  }, [pendingLevelUpCount, rewardTrack.completedLevelRewards]);

  useEffect(() => {
    const pendingValue = sessionStorage.getItem(LEVEL_UP_CHECK_STORAGE_KEY);
    if (pendingValue === null) {
      return;
    }

    const previousCompletedRewards = Number(pendingValue);
    if (!Number.isFinite(previousCompletedRewards)) {
      sessionStorage.removeItem(LEVEL_UP_CHECK_STORAGE_KEY);
      return;
    }

    sessionStorage.removeItem(LEVEL_UP_CHECK_STORAGE_KEY);

    if (rewardTrack.completedLevelRewards > previousCompletedRewards) {
      firePlayerLevelUpConfetti();
    }
  }, [rewardTrack.completedLevelRewards, rewardTrack.levelName, rewardTrack.sublevelName]);

  return null;
}
