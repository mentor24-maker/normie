"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { PlayerPortalGameBoard } from "@/components/player-portal-game-board";
import { PlayerPortalPollSectionOpen } from "@/components/player-portal-poll-section";
import type { PlayerPortalLevelEvent, PlayerPortalRewardTrack } from "@/lib/player-portal";
import {
  isPlayerPortalPlayPollsOpen,
  scrollPlayerPortalPollsIntoView
} from "@/lib/player-portal-play-polls";

type PlayerPortalDashboardTopProps = {
  levelEvents: PlayerPortalLevelEvent[];
  rewardTrack: PlayerPortalRewardTrack;
  stats: {
    pollsTaken: number;
    tokensEarned: number;
    playerRank: number | null;
  };
};

export function PlayerPortalDashboardTop({
  levelEvents,
  rewardTrack,
  stats
}: PlayerPortalDashboardTopProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shouldTargetPolls = isPlayerPortalPlayPollsOpen(pathname, searchParams);

  useEffect(() => {
    if (!shouldTargetPolls) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      scrollPlayerPortalPollsIntoView();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [shouldTargetPolls]);

  return (
    <>
      <PlayerPortalGameBoard rewardTrack={rewardTrack} stats={stats} />
      <PlayerPortalPollSectionOpen levelEvents={levelEvents} stats={stats} />
    </>
  );
}
