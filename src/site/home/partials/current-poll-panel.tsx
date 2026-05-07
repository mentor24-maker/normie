import type { CurrentPoll } from "@/src/site/home/types";

type CurrentPollPanelProps = {
  currentPoll: CurrentPoll;
  isSubmitting: boolean;
  onSubmit: (optionId: string) => void | Promise<void>;
};

export function CurrentPollPanel({ currentPoll, isSubmitting, onSubmit }: CurrentPollPanelProps) {
  return (
    <article className="panel action-panel">
      <div className="panel-label">Current Poll</div>
      <h2>{currentPoll.question}</h2>
      <div className="option-list">
        {currentPoll.options.map((option) => (
          <button
            className="option-button"
            key={option.id}
            onClick={() => void onSubmit(option.id)}
            disabled={isSubmitting}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="panel-copy">
        {isSubmitting ? "Saving your answer..." : "Choose one option to move to the next poll."}
      </p>
    </article>
  );
}
