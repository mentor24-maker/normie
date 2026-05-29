import Image from "next/image";
import chooseLogo from "@/images/logo_normie_choose.png";
import { getPollDoneMessage } from "@/lib/poll-done-copy";
import type { PollCategoryFilter, PollPayload } from "@/src/site/home/types";
import { CurrentPollPanel } from "@/src/site/home/partials/current-poll-panel";
import { PollCategoryHeadline } from "@/src/site/home/partials/poll-category-headline";
import { PreviousResultsPanel } from "@/src/site/home/partials/previous-results-panel";
import { getPollGridStyle } from "@/lib/poll-pod-config";

type PollStageProps = {
  activeCategory?: PollCategoryFilter | null;
  isLoading: boolean;
  isSubmitting: boolean;
  payload: PollPayload | null;
  onSubmit: (optionId: string) => void | Promise<void>;
};

export function PollStage({ activeCategory, isLoading, isSubmitting, payload, onSubmit }: PollStageProps) {
  if (isLoading && (!payload || payload.done)) {
    return <div className="notice">Loading polls...</div>;
  }

  if (payload?.done) {
    return <div className="notice success">{getPollDoneMessage(payload.doneReason)}</div>;
  }

  if (payload?.currentPoll) {
    return (
      <section className="poll-grid" style={getPollGridStyle(payload.settings)}>
        {activeCategory ? (
          <div className="poll-grid-category-row">
            <PollCategoryHeadline category={activeCategory} />
          </div>
        ) : null}
        <div className="poll-grid-current">
          <CurrentPollPanel
            currentPoll={payload.currentPoll}
            isSubmitting={isSubmitting}
            onSubmit={onSubmit}
            settings={payload.settings}
          />
        </div>
        <PreviousResultsPanel previousPoll={payload.previousPoll} settings={payload.settings} />
        <div className="poll-grid-logo">
          <Image
            alt="Normie choose logo"
            className="poll-grid-logo-image"
            priority
            src={chooseLogo}
          />
        </div>
      </section>
    );
  }

  return <div className="notice">No published polls are available yet.</div>;
}
