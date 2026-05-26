import { getCurrentPollPanelStyle } from "@/lib/current-poll-module";
import type { CurrentPoll, PollSettingsSnapshot } from "@/src/site/home/types";

type CurrentPollPanelProps = {
  currentPoll: CurrentPoll;
  isSubmitting: boolean;
  moduleSettings?: Record<string, string>;
  onSubmit: (optionId: string) => void | Promise<void>;
  settings?: PollSettingsSnapshot | null;
};

export function CurrentPollPanel({
  currentPoll,
  isSubmitting,
  moduleSettings = {},
  onSubmit,
  settings
}: CurrentPollPanelProps) {
  return (
    <article
      className="panel action-panel poll-module-panel"
      style={getCurrentPollPanelStyle(moduleSettings, settings)}
    >
      <div className="panel-label">Current Question</div>
      <div className="poll-question-area">
        <h2 className="poll-question">{currentPoll.question}</h2>
        <div className="option-list">
          {currentPoll.options.map((option, index) => (
            <button
              className={`option-button poll-answer-button-${index === 0 ? "a" : "b"}`}
              key={option.id}
              onClick={() => void onSubmit(option.id)}
              disabled={isSubmitting}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {isSubmitting ? <p className="panel-copy">Saving your answer...</p> : null}
    </article>
  );
}
