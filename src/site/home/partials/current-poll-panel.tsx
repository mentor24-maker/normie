import type { CurrentPoll } from "@/src/site/home/types";

type CurrentPollPanelProps = {
  currentPoll: CurrentPoll;
  isSubmitting: boolean;
  onSubmit: (optionId: string) => void | Promise<void>;
};

export function CurrentPollPanel({ currentPoll, isSubmitting, onSubmit }: CurrentPollPanelProps) {
  return (
    <article className="panel action-panel poll-module-panel">
      <div className="panel-label">Current Poll</div>
      <h2 className="poll-question">{currentPoll.question}</h2>
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
      {isSubmitting ? <p className="panel-copy">Saving your answer...</p> : null}
    </article>
  );
}
