"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, type CSSProperties } from "react";
import { normalizeBuilderAssetUrl } from "@/lib/builder-template";
import type { PlayerPortalLevelEvent, PlayerPortalRewardTrack } from "@/lib/player-portal";
import { PlayerPortalPollStage } from "@/src/site/home/partials/player-portal-poll-stage";
import { type PollAnswerResult, usePollExperience } from "@/src/site/home/use-poll-experience";
import {
  isPlayerPortalPlayPollsOpen,
  PLAYER_PORTAL_PLAY_POLLS_HREF,
  PLAYER_PORTAL_PLAY_POLLS_PARAM,
  PLAYER_PORTAL_POLLS_SECTION_ID,
  scrollPlayerPortalPollsIntoView
} from "@/lib/player-portal-play-polls";
import { appendPlayerLevelUpDiagnostic } from "@/lib/player-level-up-diagnostics";
import { PLAYER_GAME_REMINDERS_REFRESH_EVENT } from "@/components/player-game-reminders-host";
import { PLAYER_LEVEL_UP_INTERVAL } from "@/lib/player-level-up-event";
import { firePlayerLevelUpGameEvents } from "@/lib/player-portal-confetti";

export { PLAYER_PORTAL_PLAY_POLLS_HREF, PLAYER_PORTAL_PLAY_POLLS_PARAM };

type PlayerPortalPollStats = {
  pollsTaken: number;
  tokensEarned: number;
  playerRank: number | null;
};

const LEVEL_REWARD_DISKS_PER_COLUMN = 5;

function renderLevelRewardColumns(
  rewards: PlayerPortalRewardTrack["completedLevelRewardsInGrade"],
  ariaLabelPrefix: string,
  levelRewardFallback: PlayerPortalRewardTrack["pollReward"]
) {
  if (!rewards.length) {
    return null;
  }

  return Array.from(
    { length: Math.ceil(rewards.length / LEVEL_REWARD_DISKS_PER_COLUMN) },
    (_, columnIndex) => {
      const columnStart = columnIndex * LEVEL_REWARD_DISKS_PER_COLUMN;
      const columnCount = Math.min(LEVEL_REWARD_DISKS_PER_COLUMN, rewards.length - columnStart);

      return (
        <span className="player-portal-level-reward-column" key={columnIndex}>
          {Array.from({ length: columnCount }, (_, diskIndex) => {
            const rewardIndex = columnStart + diskIndex;

            return (
              <RewardDisc
                ariaLabel={`${ariaLabelPrefix} level ${rewardIndex + 1}`}
                className="player-portal-level-coin"
                isEarned
                visual={rewards[rewardIndex] ?? levelRewardFallback}
                title={`${ariaLabelPrefix} Level ${rewardIndex + 1}`}
                key={rewardIndex}
              />
            );
          })}
        </span>
      );
    }
  );
}

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

function RewardDisc({
  visual,
  isEarned = true,
  className = "player-portal-reward-disk",
  ariaLabel,
  title
}: {
  visual: PlayerPortalRewardTrack["pollReward"];
  isEarned?: boolean;
  className?: string;
  ariaLabel?: string;
  title?: string;
}) {
  const symbolUrl = isEarned ? normalizeBuilderAssetUrl(visual.visualSymbolUrl) : "";

  return (
    <span
      aria-label={ariaLabel}
      className="player-portal-reward-disc-shell"
      title={title}
    >
      <span className={className} role="img" style={rewardVisualStyle(visual, isEarned)} />
      {symbolUrl ? (
        <img
          alt=""
          aria-hidden="true"
          className="player-portal-reward-disc-symbol"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
          src={symbolUrl}
        />
      ) : null}
    </span>
  );
}

function PlayerPortalPollSectionOpen({
  onClose,
  levelEvents,
  rewardTrack,
  stats
}: {
  onClose: () => void;
  levelEvents: PlayerPortalLevelEvent[];
  rewardTrack: PlayerPortalRewardTrack;
  stats: PlayerPortalPollStats;
}) {
  const router = useRouter();
  const optimisticPollsTakenRef = useRef(stats.pollsTaken);

  useEffect(() => {
    optimisticPollsTakenRef.current = stats.pollsTaken;
  }, [stats.pollsTaken]);

  const { activeCategory, error, isLoading, isSubmitting, payload, submitAnswer } = usePollExperience({
    onAnswered: (result: PollAnswerResult) => {
      const previousPollsTaken = optimisticPollsTakenRef.current;
      const nextPollsTaken = result.playerAnswerCount ?? previousPollsTaken + 1;

      optimisticPollsTakenRef.current = nextPollsTaken;
      appendPlayerLevelUpDiagnostic("poll-answer.response", {
        previousPollsTaken,
        nextPollsTaken,
        playerAnswerCount: result.playerAnswerCount ?? null,
        levelUp: result.levelUp ?? false,
        duplicate: result.duplicate ?? false,
        claimed: result.claimed ?? false
      });

      if (result.levelUp) {
        const completedLevelRewards = Math.floor(nextPollsTaken / PLAYER_LEVEL_UP_INTERVAL);
        appendPlayerLevelUpDiagnostic("poll-answer.fire-confetti-immediate", {
          completedLevelRewards,
          levelEvents: levelEvents.length,
          playerAnswerCount: result.playerAnswerCount ?? null
        });
        void firePlayerLevelUpGameEvents(levelEvents, completedLevelRewards);
      } else {
        appendPlayerLevelUpDiagnostic("poll-answer.no-immediate-fire", {
          playerAnswerCount: result.playerAnswerCount ?? null
        });
      }

      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(PLAYER_GAME_REMINDERS_REFRESH_EVENT));
      }
    }
  });

  return (
    <section
      className="player-portal-polls is-open"
      aria-label="Play polls"
      id={PLAYER_PORTAL_POLLS_SECTION_ID}
    >
      <header className="player-portal-polls-bar">
        <div className="player-portal-polls-bar-copy">
          <p className="panel-label">Game Board</p>
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
            <div
              className="player-portal-grade-reward-strip"
              aria-label={`Grade ${rewardTrack.currentGrade} reward progress`}
            >
              {rewardTrack.completedGradeCoins.length > 0 ? (
                <div
                  className="player-portal-grade-coin-row"
                  aria-label={`Completed ${rewardTrack.levelName} coins`}
                >
                  {rewardTrack.completedGradeCoins.map((gradeCoin, gradeIndex) => (
                    <RewardDisc
                      ariaLabel={`${rewardTrack.levelName} ${gradeIndex + 1} graduation coin`}
                      className="player-portal-level-coin player-portal-grade-coin"
                      isEarned
                      key={`grade-coin-${gradeIndex}`}
                      title={`${rewardTrack.levelName} ${gradeIndex + 1} Coin`}
                      visual={gradeCoin}
                    />
                  ))}
                </div>
              ) : null}
              {rewardTrack.completedLevelRewardsInGrade.length > 0 ? (
                <div
                  className="player-portal-level-reward-stack"
                  aria-label={`${rewardTrack.levelName} ${rewardTrack.currentGrade} completed level coins`}
                >
                  {renderLevelRewardColumns(
                    rewardTrack.completedLevelRewardsInGrade,
                    `${rewardTrack.levelName} ${rewardTrack.currentGrade}`,
                    rewardTrack.pollReward
                  )}
                </div>
              ) : null}
            </div>
          </div>
          <div className="player-portal-reward-track-row">
            <div
              className="player-portal-reward-track"
              aria-label={`${rewardTrack.levelName} ${rewardTrack.currentGrade} level ${rewardTrack.currentLevel} poll progress`}
            >
              {Array.from({ length: rewardTrack.totalSlots }, (_, index) => (
                <RewardDisc
                  ariaLabel={index < rewardTrack.earnedSlots ? "Earned reward" : "Unearned reward"}
                  className={`player-portal-reward-disk${index < rewardTrack.earnedSlots ? " is-earned" : ""}`}
                  isEarned={index < rewardTrack.earnedSlots}
                  key={index}
                  visual={rewardTrack.pollReward}
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
  levelEvents,
  rewardTrack,
  stats
}: {
  levelEvents: PlayerPortalLevelEvent[];
  rewardTrack: PlayerPortalRewardTrack;
  stats: PlayerPortalPollStats;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOpen = isPlayerPortalPlayPollsOpen(pathname, searchParams);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      scrollPlayerPortalPollsIntoView();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function closePolls() {
    router.replace(`/portal/dashboard?${PLAYER_PORTAL_PLAY_POLLS_PARAM}=0`, { scroll: false });
  }

  return <PlayerPortalPollSectionOpen levelEvents={levelEvents} onClose={closePolls} rewardTrack={rewardTrack} stats={stats} />;
}

export { isPlayerPortalPlayPollsOpen } from "@/lib/player-portal-play-polls";
