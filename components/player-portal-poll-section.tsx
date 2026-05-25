"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PlayerPortalPollStage } from "@/src/site/home/partials/player-portal-poll-stage";
import { usePollExperience } from "@/src/site/home/use-poll-experience";
import {
  PLAYER_PORTAL_PLAY_POLLS_HREF,
  PLAYER_PORTAL_PLAY_POLLS_PARAM
} from "@/lib/player-portal-play-polls";

export { PLAYER_PORTAL_PLAY_POLLS_HREF, PLAYER_PORTAL_PLAY_POLLS_PARAM };

type PlayerPortalPollStats = {
  pollsTaken: number;
  tokensEarned: number;
  playerRank: number | null;
};

function PlayerPortalPollSectionOpen({
  onClose,
  stats
}: {
  onClose: () => void;
  stats: PlayerPortalPollStats;
}) {
  const router = useRouter();
  const { activeCategory, error, isLoading, isSubmitting, payload, submitAnswer } = usePollExperience({
    onAnswered: () => router.refresh()
  });

  return (
    <section className="player-portal-polls is-open" aria-label="Play polls">
      <header className="player-portal-polls-bar">
        <div className="player-portal-polls-bar-copy">
          <p className="panel-label">Play Polls</p>
          <h2 className="player-portal-polls-title">Answer the Current Question</h2>
        </div>
        <div className="player-portal-polls-header-side">
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

export function PlayerPortalPollSection({ stats }: { stats: PlayerPortalPollStats }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOpen = searchParams.get(PLAYER_PORTAL_PLAY_POLLS_PARAM) === "1";

  if (!isOpen || pathname !== "/portal/dashboard") {
    return null;
  }

  function closePolls() {
    router.replace("/portal/dashboard", { scroll: false });
  }

  return <PlayerPortalPollSectionOpen onClose={closePolls} stats={stats} />;
}

export function isPlayerPortalPlayPollsOpen(
  pathname: string,
  searchParams: Pick<URLSearchParams, "get">
): boolean {
  return pathname === "/portal/dashboard" && searchParams.get(PLAYER_PORTAL_PLAY_POLLS_PARAM) === "1";
}
