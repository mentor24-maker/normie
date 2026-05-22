"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PlayerPortalPollStage } from "@/src/site/home/partials/player-portal-poll-stage";
import { usePollExperience } from "@/src/site/home/use-poll-experience";

export const PLAYER_PORTAL_PLAY_POLLS_PARAM = "playPolls";
export const PLAYER_PORTAL_PLAY_POLLS_HREF = `/portal/dashboard?${PLAYER_PORTAL_PLAY_POLLS_PARAM}=1`;

function PlayerPortalPollSectionOpen({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { activeCategory, error, isLoading, isSubmitting, payload, submitAnswer } = usePollExperience({
    onAnswered: () => router.refresh()
  });

  return (
    <section className="player-portal-polls is-open" aria-label="Play polls">
      <header className="player-portal-polls-bar">
        <div className="player-portal-polls-bar-copy">
          <p className="panel-label">Play Polls</p>
          <h2 className="player-portal-polls-title">Answer the current question</h2>
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

export function PlayerPortalPollSection() {
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

  return <PlayerPortalPollSectionOpen onClose={closePolls} />;
}

export function isPlayerPortalPlayPollsOpen(
  pathname: string,
  searchParams: Pick<URLSearchParams, "get">
): boolean {
  return pathname === "/portal/dashboard" && searchParams.get(PLAYER_PORTAL_PLAY_POLLS_PARAM) === "1";
}
