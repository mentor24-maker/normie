"use client";

import { useEffect } from "react";
import type { PlayerPortalRewardTrack } from "@/lib/player-portal";
import { PLAYER_LEVEL_UP_INTERVAL, PLAYER_LEVEL_UP_PENDING_COOKIE } from "@/lib/player-level-up-event";
import { appendPlayerLevelUpDiagnostic } from "@/lib/player-level-up-diagnostics";
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

    appendPlayerLevelUpDiagnostic("pending-cookie.detected", {
      pendingLevelUpCount,
      completedLevelRewards: rewardTrack.completedLevelRewards
    });
    clearPendingLevelUpCookie();

    const completedCount = rewardTrack.completedLevelRewards * PLAYER_LEVEL_UP_INTERVAL;
    if (pendingLevelUpCount <= completedCount) {
      appendPlayerLevelUpDiagnostic("pending-cookie.fire-confetti", {
        pendingLevelUpCount,
        completedCount
      });
      void firePlayerLevelUpConfetti();
    } else {
      appendPlayerLevelUpDiagnostic("pending-cookie.waiting-for-dashboard-count", {
        pendingLevelUpCount,
        completedCount
      });
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
      appendPlayerLevelUpDiagnostic("session-check.fire-confetti", {
        previousCompletedRewards,
        completedLevelRewards: rewardTrack.completedLevelRewards
      });
      void firePlayerLevelUpConfetti();
    } else {
      appendPlayerLevelUpDiagnostic("session-check.no-fire", {
        previousCompletedRewards,
        completedLevelRewards: rewardTrack.completedLevelRewards
      });
    }
  }, [rewardTrack.completedLevelRewards, rewardTrack.levelName, rewardTrack.sublevelName]);

  return null;
}
