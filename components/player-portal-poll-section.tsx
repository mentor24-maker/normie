"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CSSProperties } from "react";
import type { PlayerPortalRewardTrack } from "@/lib/player-portal";
import { PlayerPortalPollStage } from "@/src/site/home/partials/player-portal-poll-stage";
import { usePollExperience } from "@/src/site/home/use-poll-experience";
import {
  PLAYER_PORTAL_PLAY_POLLS_HREF,
  PLAYER_PORTAL_PLAY_POLLS_PARAM
} from "@/lib/player-portal-play-polls";
import { markPlayerLevelUpCheckPending } from "@/components/player-portal-level-up-celebration";

export { PLAYER_PORTAL_PLAY_POLLS_HREF, PLAYER_PORTAL_PLAY_POLLS_PARAM };

type PlayerPortalPollStats = {
  pollsTaken: number;
  tokensEarned: number;
  playerRank: number | null;
};

function rewardVisualStyle(
  visual: PlayerPortalRewardTrack["pollReward"],
  isEarned = true
): CSSProperties {
  const borderWidth = visual.visualBorderWidth || "0";

  return {
    width: visual.visualSize,
    height: visual.visualSize,
    background: isEarned ? visual.visualColor : "transparent",
    borderColor: isEarned ? visual.visualBorderColor || visual.visualColor : "#cbd5e1",
    borderWidth: isEarned ? borderWidth : "1px"
  };
}

function PlayerPortalPollSectionOpen({
  onClose,
  rewardTrack,
  stats
}: {
  onClose: () => void;
  rewardTrack: PlayerPortalRewardTrack;
  stats: PlayerPortalPollStats;
}) {
  const router = useRouter();
  const { activeCategory, error, isLoading, isSubmitting, payload, submitAnswer } = usePollExperience({
    onAnswered: () => {
      if (!rewardTrack.isComplete) {
        markPlayerLevelUpCheckPending();
      }
      router.refresh();
    }
  });

  return (
    <section className="player-portal-polls is-open" aria-label="Play polls">
      <header className="player-portal-polls-bar">
        <div className="player-portal-polls-bar-copy">
          <p className="panel-label">Play Polls</p>
          <h2 className="player-portal-polls-title">Answer the Current Question</h2>
        </div>
        <div className="player-portal-polls-header-side">
          <div className="player-portal-reward-top-row">
            <div className="player-portal-polls-mini-stats" aria-label="Player stats">
              <Link
                aria-label={`Polls taken: ${stats.pollsTaken}. View My Polls`}
                className="player-portal-polls-mini-stat player-portal-polls-mini-stat-sky"
                href="/portal/polls"
              >
                <span>Polls</span>
                <strong>{stats.pollsTaken}</strong>
              </Link>
              <Link
                aria-label={`Points earned: ${stats.tokensEarned}. View Points`}
                className="player-portal-polls-mini-stat player-portal-polls-mini-stat-gold"
                href="/portal/points"
              >
                <span>Points</span>
                <strong>{stats.tokensEarned}</strong>
              </Link>
              <Link
                aria-label={`Leaderboard rank: ${stats.playerRank ? `#${stats.playerRank}` : "New"}. View Leaderboard`}
                className="player-portal-polls-mini-stat player-portal-polls-mini-stat-mint"
                href="/portal/leaderboard"
              >
                <span>Rank</span>
                <strong>{stats.playerRank ? `#${stats.playerRank}` : "New"}</strong>
              </Link>
            </div>
          </div>
          <div className="player-portal-reward-track-row">
            <div
              className="player-portal-level-reward-stack"
              aria-label={`${rewardTrack.levelName}: ${rewardTrack.sublevelName} completed rewards`}
            >
              {rewardTrack.isComplete ? (
                <span
                  aria-label={`${rewardTrack.levelName}: ${rewardTrack.sublevelName} complete`}
                  className="player-portal-level-coin"
                  role="img"
                  style={rewardVisualStyle(rewardTrack.levelReward)}
                  tabIndex={0}
                  title={`${rewardTrack.levelName}: ${rewardTrack.sublevelName} Complete`}
                >
                  <span className="player-portal-level-coin-tooltip" role="tooltip">
                    {rewardTrack.levelName}: {rewardTrack.sublevelName} Complete
                  </span>
                </span>
              ) : null}
            </div>
            <div
              className="player-portal-reward-track"
              aria-label={`${rewardTrack.levelName}: ${rewardTrack.sublevelName} progress rewards`}
            >
              {Array.from({ length: rewardTrack.totalSlots }, (_, index) => (
                <span
                  aria-label={index < rewardTrack.earnedSlots ? "Earned reward" : "Unearned reward"}
                  className={`player-portal-reward-disk${index < rewardTrack.earnedSlots ? " is-earned" : ""}`}
                  key={index}
                  role="img"
                  style={rewardVisualStyle(rewardTrack.pollReward, index < rewardTrack.earnedSlots)}
                />
              ))}
            </div>
          </div>
          <button
            aria-label="Close Play Polls"
            className="player-portal-polls-close"
            onClick={onClose}
            title="Close"
            type="button"
          >
            ×
          </button>
        </div>
      </header>
      {error ? <div className="notice error">{error}</div> : null}
      <PlayerPortalPollStage
        activeCategory={activeCategory}
        isLoading={isLoading}
        isSubmitting={isSubmitting}
        payload={payload}
        onSubmit={submitAnswer}
      />
    </section>
  );
}

export function PlayerPortalPollSection({
  rewardTrack,
  stats
}: {
  rewardTrack: PlayerPortalRewardTrack;
  stats: PlayerPortalPollStats;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDashboard = pathname === "/portal/dashboard";
  const isOpen = isDashboard && searchParams.get(PLAYER_PORTAL_PLAY_POLLS_PARAM) !== "0";

  if (!isOpen) {
    return null;
  }

  function closePolls() {
    router.replace(`/portal/dashboard?${PLAYER_PORTAL_PLAY_POLLS_PARAM}=0`, { scroll: false });
  }

  return <PlayerPortalPollSectionOpen onClose={closePolls} rewardTrack={rewardTrack} stats={stats} />;
}

export function isPlayerPortalPlayPollsOpen(
  pathname: string,
  searchParams: Pick<URLSearchParams, "get">
): boolean {
  return pathname === "/portal/dashboard" && searchParams.get(PLAYER_PORTAL_PLAY_POLLS_PARAM) !== "0";
}
