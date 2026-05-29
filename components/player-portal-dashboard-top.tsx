"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { PlayerPortalGameBoard } from "@/components/player-portal-game-board";
import { PlayerPortalPollSectionOpen } from "@/components/player-portal-poll-section";
import type { PlayerPortalLevelEvent, PlayerPortalRewardTrack } from "@/lib/player-portal";
import {
  isPlayerPortalPlayPollsOpen,
  PLAYER_PORTAL_PLAY_POLLS_PARAM,
  PLAYER_PORTAL_POLLS_SECTION_ID,
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const pollsAreOpen = isPlayerPortalPlayPollsOpen(pathname, searchParams);

  useEffect(() => {
    if (!pollsAreOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      scrollPlayerPortalPollsIntoView();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pollsAreOpen]);

  function closePolls() {
    router.replace(`/portal/dashboard?${PLAYER_PORTAL_PLAY_POLLS_PARAM}=0`, { scroll: false });
  }

  return (
    <>
      <PlayerPortalGameBoard
        onClose={pollsAreOpen ? closePolls : undefined}
        rewardTrack={rewardTrack}
        stats={stats}
      />
      {pollsAreOpen ? (
        <PlayerPortalPollSectionOpen levelEvents={levelEvents} stats={stats} />
      ) : null}
    </>
  );
}
