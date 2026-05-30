import { getCurrentPollPanelStyle } from "@/lib/current-poll-module";
import type { CurrentPoll, PollSettingsSnapshot } from "@/src/site/home/types";

type CurrentPollPanelProps = {
  currentPoll: CurrentPoll;
  isSubmitting: boolean;
  moduleSettings?: Record<string, string>;
  onSubmit: (optionId: string) => void | Promise<void>;
  onSkip?: () => void | Promise<void>;
  settings?: PollSettingsSnapshot | null;
  showSkipPoll?: boolean;
};

export function CurrentPollPanel({
  currentPoll,
  isSubmitting,
  moduleSettings = {},
  onSubmit,
  onSkip,
  settings,
  showSkipPoll = false
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
        {showSkipPoll && onSkip ? (
          <div className="player-poll-skip-row">
            <button
              className="secondary-button player-poll-skip-button"
              disabled={isSubmitting}
              onClick={() => void onSkip()}
              type="button"
            >
              Skip Question
            </button>
          </div>
        ) : null}
      </div>
      {isSubmitting ? <p className="panel-copy">Saving your answer...</p> : null}
    </article>
  );
}
