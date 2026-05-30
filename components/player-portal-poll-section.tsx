"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { PlayerPortalLevelEvent } from "@/lib/player-portal";
import { PlayerPortalPollStage } from "@/src/site/home/partials/player-portal-poll-stage";
import { type PollAnswerResult, usePollExperience } from "@/src/site/home/use-poll-experience";
import { PLAYER_PORTAL_POLLS_SECTION_ID } from "@/lib/player-portal-play-polls";
import { appendPlayerLevelUpDiagnostic } from "@/lib/player-level-up-diagnostics";
import { PLAYER_GAME_REMINDERS_REFRESH_EVENT } from "@/components/player-game-reminders-host";
import { PLAYER_LEVEL_UP_INTERVAL } from "@/lib/player-level-up-event";
import { firePlayerLevelUpGameEvents } from "@/lib/player-portal-confetti";

export type PlayerPortalPollStats = {
  pollsTaken: number;
  tokensEarned: number;
  playerRank: number | null;
};

export function PlayerPortalPollSectionOpen({
  levelEvents,
  stats
}: {
  levelEvents: PlayerPortalLevelEvent[];
  stats: PlayerPortalPollStats;
}) {
  const router = useRouter();
  const optimisticPollsTakenRef = useRef(stats.pollsTaken);

  useEffect(() => {
    optimisticPollsTakenRef.current = stats.pollsTaken;
  }, [stats.pollsTaken]);

  const { activeCategory, error, isLoading, isSubmitting, payload, showSkipPoll, skipCurrentPoll, submitAnswer } = usePollExperience({
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
      {error ? <div className="notice error">{error}</div> : null}
      <PlayerPortalPollStage
        activeCategory={activeCategory}
        isLoading={isLoading}
        isSubmitting={isSubmitting}
        payload={payload}
        onSkip={() => void skipCurrentPoll()}
        onSubmit={submitAnswer}
        showSkipPoll={showSkipPoll}
      />
    </section>
  );
}

export {
  isPlayerPortalPlayPollsOpen,
  PLAYER_PORTAL_PLAY_POLLS_HREF,
  PLAYER_PORTAL_PLAY_POLLS_PARAM
} from "@/lib/player-portal-play-polls";
