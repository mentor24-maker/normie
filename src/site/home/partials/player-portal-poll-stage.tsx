import { getPollDoneMessage } from "@/lib/poll-done-copy";
import type { PollCategoryFilter, PollPayload } from "@/src/site/home/types";
import { CurrentPollPanel } from "@/src/site/home/partials/current-poll-panel";
import { PollCategoryHeadline } from "@/src/site/home/partials/poll-category-headline";
import { PreviousResultsPanel } from "@/src/site/home/partials/previous-results-panel";
import { getPollGridStyle } from "@/lib/poll-pod-config";

type PlayerPortalPollStageProps = {
  activeCategory?: PollCategoryFilter | null;
  isLoading: boolean;
  isSubmitting: boolean;
  payload: PollPayload | null;
  onSubmit: (optionId: string) => void | Promise<void>;
};

export function PlayerPortalPollStage({
  activeCategory,
  isLoading,
  isSubmitting,
  payload,
  onSubmit
}: PlayerPortalPollStageProps) {
  if (isLoading) {
    return <div className="notice">Loading polls...</div>;
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

  if (payload?.currentPoll) {
    return (
      <section className="poll-grid player-portal-poll-grid" style={getPollGridStyle(payload.settings)}>
        {activeCategory ? (
          <div className="poll-grid-category-row">
            <PollCategoryHeadline category={activeCategory} />
          </div>
        ) : null}
        <div className="poll-grid-current player-portal-poll-current">
          <CurrentPollPanel
            currentPoll={payload.currentPoll}
            isSubmitting={isSubmitting}
            onSubmit={onSubmit}
            settings={payload.settings}
          />
        </div>
        <div className="player-portal-poll-previous">
          <PreviousResultsPanel previousPoll={payload.previousPoll} settings={payload.settings} />
        </div>
      </section>
    );
  }

  return <div className="notice">No published polls are available yet.</div>;
}
