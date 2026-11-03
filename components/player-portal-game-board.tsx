"use client";

import Link from "next/link";
import { RewardDiscPreview } from "@/components/reward-disc-preview";
import type { PlayerPortalRewardTrack } from "@/lib/player-portal";

export const PLAYER_PORTAL_HOME_BASE_ID = "player-portal-home-base";

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
              <RewardDiscPreview
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

export function PlayerPortalGameBoard({
  onClose,
  rewardTrack,
  stats,
  testerPollNumber = null
}: {
  onClose?: () => void;
  rewardTrack: PlayerPortalRewardTrack;
  stats: PlayerPortalGameBoardStats;
  testerPollNumber?: number | null;
}) {
  return (
    <section
      aria-label="Game board"
      className="player-portal-game-board"
      id={PLAYER_PORTAL_HOME_BASE_ID}
    >
      <header className="player-portal-polls-bar">
        <div className="player-portal-polls-bar-copy">
          <p className="panel-label">Home Base</p>
        </div>
        <div className="player-portal-polls-header-side">
          <div
            className="player-portal-home-base-layout"
            aria-label={`Class ${rewardTrack.currentClass}, grade ${rewardTrack.currentGrade} reward progress`}
          >
            <div className="player-portal-home-base-left">
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
                className="player-portal-reward-track"
                aria-label={`${rewardTrack.levelName} ${rewardTrack.currentGrade} level ${rewardTrack.currentLevel} poll progress`}
              >
                {Array.from({ length: rewardTrack.totalSlots }, (_, index) => (
                  <RewardDiscPreview
                    ariaLabel={index < rewardTrack.earnedSlots ? "Earned reward" : "Unearned reward"}
                    className="player-portal-reward-disk"
                    isEarned={index < rewardTrack.earnedSlots}
                    key={index}
                    visual={rewardTrack.pollReward}
                  />
                ))}
              </div>
            </div>
            {rewardTrack.completedLevelRewardsInGrade.length > 0 ||
            rewardTrack.completedGradeCoins.length > 0 ||
            rewardTrack.completedClassCoins.length > 0 ? (
              <div className="player-portal-grade-reward-strip">
                {rewardTrack.completedLevelRewardsInGrade.length > 0 ? (
                  <div
                    className="player-portal-level-reward-stack"
                    aria-label={`${rewardTrack.levelName} ${rewardTrack.currentGrade} completed level coins`}
                  >
                    {renderLevelRewardColumns(
                      rewardTrack.completedLevelRewardsInGrade,
                      `${rewardTrack.levelName} ${rewardTrack.currentGrade}`,
                      rewardTrack.levelReward
                    )}
                  </div>
                ) : null}
                {rewardTrack.completedGradeCoins.length > 0 ? (
                  <div
                    className="player-portal-grade-coin-row"
                    aria-label={`Completed ${rewardTrack.levelName} coins`}
                  >
                    {rewardTrack.completedGradeCoins.map((gradeCoin, gradeIndex) => (
                      <RewardDiscPreview
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
                {rewardTrack.completedClassCoins.length > 0 ? (
                  <div className="player-portal-class-coin-row" aria-label="Completed class coins">
                    {rewardTrack.completedClassCoins.map((classCoin, classIndex) => (
                      <RewardDiscPreview
                        ariaLabel={`Class ${classIndex + 1} graduation coin`}
                        className="player-portal-level-coin player-portal-class-coin"
                        isEarned
                        key={`class-coin-${classIndex}`}
                        title={`Class ${classIndex + 1} Coin`}
                        visual={classCoin}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {testerPollNumber != null ? (
              <div className="player-portal-home-base-right">
                <p
                  aria-label={`Tester poll number ${testerPollNumber}`}
                  className="player-portal-tester-poll-diagnostic"
                >
                  <strong>{testerPollNumber}</strong>
                </p>
              </div>
            ) : null}
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
