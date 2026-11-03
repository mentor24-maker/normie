"use client";

import { useMemo, useState } from "react";
import { formatRichTextContent } from "@/lib/builder-template";
import type { SurveyInterstitialClient } from "@/lib/game-interstitial-survey";
import type { PollSettingsSnapshot } from "@/lib/poll-pod-config";
import { getPollGridStyle, getPollPodAppearanceStyle } from "@/lib/poll-pod-config";

type SurveyInterstitialPanelProps = {
  survey: SurveyInterstitialClient;
  settings?: PollSettingsSnapshot;
  isSubmitting?: boolean;
  onSubmit: (answers: Record<string, string>) => void | Promise<void>;
};

export function SurveyInterstitialPanel({
  survey,
  settings,
  isSubmitting = false,
  onSubmit
}: SurveyInterstitialPanelProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const panelStyle = useMemo(() => getPollPodAppearanceStyle(settings, "interstitial"), [settings]);
  const instructionsHtml = formatRichTextContent(survey.instructionsHtml);
  const allAnswered = survey.questions.every((question) => Boolean(answers[question.id]));

  function selectAnswer(questionId: string, optionId: string) {
    setAnswers((current) => ({ ...current, [questionId]: optionId }));
  }

  return (
    <section className="poll-grid poll-survey-interstitial-grid" style={getPollGridStyle(settings)}>
      <article className="panel poll-module-panel poll-survey-interstitial-instructions" style={panelStyle}>
        <div className="panel-label">{survey.headerLabel || "Survey"}</div>
        <div
          className="poll-survey-interstitial-copy"
          dangerouslySetInnerHTML={{
            __html: instructionsHtml || "<p>Please answer the questions on the right.</p>"
          }}
        />
      </article>

      <article className="panel action-panel poll-module-panel poll-survey-interstitial-questions" style={panelStyle}>
        <div className="panel-label">Your Responses</div>
        <div className="poll-survey-question-list">
          {survey.questions.map((question, questionIndex) => (
            <section className="poll-survey-question-block" key={question.id}>
              <h3 className="poll-survey-question-prompt">
                <span className="poll-survey-question-index">{questionIndex + 1}.</span>
                {question.prompt}
              </h3>
              <div className="option-list poll-survey-option-list">
                {question.options.map((option, optionIndex) => {
                  const isSelected = answers[question.id] === option.id;

                  return (
                    <button
                      aria-pressed={isSelected}
                      className={`option-button poll-answer-button-${optionIndex % 2 === 0 ? "a" : "b"} poll-survey-option-button${isSelected ? " is-selected" : ""}`}
                      disabled={isSubmitting}
                      key={option.id}
                      onClick={() => selectAnswer(question.id, option.id)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        <div className="poll-pod-action-row">
          <button
            className="submit-button admin-blog-add-button poll-survey-submit-button"
            disabled={isSubmitting || !allAnswered}
            onClick={() => void onSubmit(answers)}
            type="button"
          >
            {isSubmitting ? "Saving..." : "Continue"}
          </button>
        </div>
      </article>
    </section>
  );
}
