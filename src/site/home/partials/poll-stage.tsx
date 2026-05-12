import Image from "next/image";
import chooseLogo from "@/images/logo_normie_choose.png";
import type { PollPayload } from "@/src/site/home/types";
import { CurrentPollPanel } from "@/src/site/home/partials/current-poll-panel";
import { PreviousResultsPanel } from "@/src/site/home/partials/previous-results-panel";

type PollStageProps = {
  isLoading: boolean;
  isSubmitting: boolean;
  payload: PollPayload | null;
  onSubmit: (optionId: string) => void | Promise<void>;
};

export function PollStage({ isLoading, isSubmitting, payload, onSubmit }: PollStageProps) {
  if (isLoading) {
    return <div className="notice">Loading polls...</div>;
  }

  if (payload?.done) {
    return <div className="notice success">You&apos;re done. Thanks for finishing the full poll sequence.</div>;
  }

  if (payload?.currentPoll) {
    return (
      <section className="poll-grid">
        <CurrentPollPanel
          currentPoll={payload.currentPoll}
          isSubmitting={isSubmitting}
          onSubmit={onSubmit}
        />
        <PreviousResultsPanel previousPoll={payload.previousPoll} />
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
