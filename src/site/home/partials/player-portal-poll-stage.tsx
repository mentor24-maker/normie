import { getPollDoneMessage } from "@/lib/poll-done-copy";
import type { PollPayload } from "@/src/site/home/types";
import { CurrentPollPanel } from "@/src/site/home/partials/current-poll-panel";
import { PreviousResultsPanel } from "@/src/site/home/partials/previous-results-panel";
import { SurveyInterstitialPanel } from "@/src/site/home/partials/survey-interstitial-panel";
import { getPollGridStyle } from "@/lib/poll-pod-config";

type PlayerPortalPollStageProps = {
  isLoading: boolean;
  isReacting?: boolean;
  isSubmitting: boolean;
  isSubmittingSurvey?: boolean;
  payload: PollPayload | null;
  onReact?: (reaction: "like" | "dislike") => void | Promise<void>;
  onSubmit: (optionId: string) => void | Promise<void>;
  onSubmitSurvey?: (answers: Record<string, string>) => void | Promise<void>;
  onSkip?: () => void | Promise<void>;
  showPollReactions?: boolean;
  showSkipPoll?: boolean;
};

export function PlayerPortalPollStage({
  isLoading,
  isReacting = false,
  isSubmitting,
  isSubmittingSurvey = false,
  payload,
  onReact,
  onSubmit,
  onSubmitSurvey,
  onSkip,
  showPollReactions = false,
  showSkipPoll = false
}: PlayerPortalPollStageProps) {
  const isAwaitingNextPoll = isLoading && Boolean(payload?.currentPoll);

  if (isLoading && !payload?.currentPoll && !payload?.surveyInterstitial && (!payload || payload.done)) {
    return <div className="notice player-portal-polls-loading">Loading polls...</div>;
  }

  if (payload?.done) {
    const isBlocked =
      payload.doneReason === "no_polls_matching_preferences" ||
      payload.doneReason === "no_polls_in_category" ||
      payload.doneReason === "invalid_category";

    return (
      <div className={isBlocked ? "notice error admin-notice" : "notice success admin-notice"}>
        {getPollDoneMessage(payload.doneReason)}
      </div>
    );
  }

  if (payload?.surveyInterstitial && onSubmitSurvey) {
    return (
      <SurveyInterstitialPanel
        isSubmitting={isSubmittingSurvey}
        onSubmit={onSubmitSurvey}
        settings={payload.settings}
        survey={payload.surveyInterstitial}
      />
    );
  }

  if (payload?.currentPoll) {
    return (
      <section
        className={`poll-grid player-portal-poll-grid${isAwaitingNextPoll ? " player-portal-poll-grid-awaiting-next" : ""}`}
        style={getPollGridStyle(payload.settings)}
      >
        <div className="poll-grid-current player-portal-poll-current">
          <CurrentPollPanel
            currentPoll={payload.currentPoll}
            isAwaitingNextPoll={isAwaitingNextPoll}
            isSubmitting={isSubmitting}
            onSkip={onSkip}
            onSubmit={onSubmit}
            settings={payload.settings}
            showSkipPoll={showSkipPoll}
          />
        </div>
        <div className="player-portal-poll-previous">
          <PreviousResultsPanel
            isReacting={isReacting}
            onReact={onReact}
            playerReaction={payload.previousPoll?.playerReaction ?? null}
            previousPoll={payload.previousPoll}
            settings={payload.settings}
            showPollReactions={showPollReactions}
          />
        </div>
      </section>
    );
  }

  return <div className="notice">No published polls are available yet.</div>;
}
