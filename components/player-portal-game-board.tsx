"use client";

import Link from "next/link";
import { type CSSProperties } from "react";
import { normalizeBuilderAssetUrl } from "@/lib/builder-template";
import type { PlayerPortalRewardTrack } from "@/lib/player-portal";

export type PlayerPortalGameBoardStats = {
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
    <span aria-label={ariaLabel} className="player-portal-reward-disc-shell" title={title}>
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

export function PlayerPortalGameBoard({
  onClose,
  rewardTrack,
  stats
}: {
  onClose?: () => void;
  rewardTrack: PlayerPortalRewardTrack;
  stats: PlayerPortalGameBoardStats;
}) {
  return (
    <section aria-label="Game board" className="player-portal-game-board">
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
          {onClose ? (
            <button
              aria-label="Close Play Polls"
              className="player-portal-polls-close"
              onClick={onClose}
              title="Close"
              type="button"
            >
              ×
            </button>
          ) : null}
        </div>
      </header>
    </section>
  );
}
