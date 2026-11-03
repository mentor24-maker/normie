"use client";

import {
  createDefaultSurveyConfig,
  createDefaultSurveyQuestion,
  instructionsHtmlToPlainText,
  plainTextToInstructionsHtml,
  type GameInterstitialSurveyConfig,
  SURVEY_OPTION_MAX,
  SURVEY_OPTION_MIN,
  SURVEY_QUESTION_MAX
} from "@/lib/game-interstitial-survey";
import { BuilderSettingRow } from "@/components/builder/builder-setting-row";

type AdminSurveyInterstitialFieldsProps = {
  survey: GameInterstitialSurveyConfig;
  onChange: (next: GameInterstitialSurveyConfig) => void;
};

export function AdminSurveyInterstitialFields({ survey, onChange }: AdminSurveyInterstitialFieldsProps) {
  const normalized = survey.questions.length > 0 ? survey : createDefaultSurveyConfig();

  function updateSurvey(patch: Partial<GameInterstitialSurveyConfig>) {
    onChange({ ...normalized, ...patch });
  }

  function updateQuestion(questionId: string, patch: Partial<GameInterstitialSurveyConfig["questions"][number]>) {
    updateSurvey({
      questions: normalized.questions.map((question) =>
        question.id === questionId ? { ...question, ...patch } : question
      )
    });
  }

  function updateQuestionOption(
    questionId: string,
    optionId: string,
    label: string
  ) {
    updateSurvey({
      questions: normalized.questions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: question.options.map((option) =>
                option.id === optionId ? { ...option, label } : option
              )
            }
          : question
      )
    });
  }

  function addQuestion() {
    if (normalized.questions.length >= SURVEY_QUESTION_MAX) {
      return;
    }

    updateSurvey({
      questions: [...normalized.questions, createDefaultSurveyQuestion(normalized.questions.length + 1)]
    });
  }

  function removeQuestion(questionId: string) {
    if (normalized.questions.length <= 1) {
      return;
    }

    updateSurvey({
      questions: normalized.questions.filter((question) => question.id !== questionId)
    });
  }

  function addOption(questionId: string) {
    updateSurvey({
      questions: normalized.questions.map((question) => {
        if (question.id !== questionId || question.options.length >= SURVEY_OPTION_MAX) {
          return question;
        }

        return {
          ...question,
          options: [...question.options, { id: crypto.randomUUID(), label: "" }]
        };
      })
    });
  }

  function removeOption(questionId: string, optionId: string) {
    updateSurvey({
      questions: normalized.questions.map((question) => {
        if (question.id !== questionId || question.options.length <= SURVEY_OPTION_MIN) {
          return question;
        }

        return {
          ...question,
          options: question.options.filter((option) => option.id !== optionId)
        };
      })
    });
  }

  return (
    <div className="admin-survey-interstitial-fields">
      <BuilderSettingRow fullWidth label="Header Label">
        <input
          className="admin-game-reward-field-medium"
          type="text"
          value={normalized.headerLabel}
          onChange={(event) => updateSurvey({ headerLabel: event.target.value })}
          placeholder="Quick Survey"
        />
      </BuilderSettingRow>
      <BuilderSettingRow fullWidth label="Show Every">
        <div className="admin-survey-inline-number-field">
          <input
            className="admin-game-reward-field-number"
            min="1"
            type="number"
            value={normalized.showEveryPolls}
            onChange={(event) =>
              updateSurvey({ showEveryPolls: Math.max(1, Number(event.target.value) || 1) })
            }
          />
          <span className="admin-survey-inline-suffix">Polls Answered</span>
        </div>
      </BuilderSettingRow>
      <BuilderSettingRow fullWidth label="Instructions">
        <textarea
          className="admin-game-reward-field-textarea"
          value={instructionsHtmlToPlainText(normalized.instructionsHtml)}
          onChange={(event) =>
            updateSurvey({
              instructionsHtml: plainTextToInstructionsHtml(event.target.value)
            })
          }
          placeholder="Tell players why you are asking and how to answer."
          rows={5}
        />
      </BuilderSettingRow>

      <div className="admin-survey-question-list">
        {normalized.questions.map((question, questionIndex) => (
          <section className="admin-survey-question-card" key={question.id}>
            <div className="admin-survey-question-card-header">
              <strong>Question {questionIndex + 1}</strong>
              {normalized.questions.length > 1 ? (
                <button
                  className="secondary-button admin-survey-remove-button"
                  onClick={() => removeQuestion(question.id)}
                  type="button"
                >
                  Remove Question
                </button>
              ) : null}
            </div>
            <BuilderSettingRow fullWidth label="Prompt">
              <input
                className="admin-game-reward-field-medium"
                type="text"
                value={question.prompt}
                onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })}
                placeholder="How often do you play polls?"
              />
            </BuilderSettingRow>
            <div className="admin-survey-option-list">
              {question.options.map((option, optionIndex) => (
                <BuilderSettingRow fullWidth key={option.id} label={`Option ${optionIndex + 1}`}>
                  <div className="admin-survey-option-row">
                    <input
                      className="admin-game-reward-field-medium"
                      type="text"
                      value={option.label}
                      onChange={(event) => updateQuestionOption(question.id, option.id, event.target.value)}
                      placeholder="Answer choice"
                    />
                    {question.options.length > SURVEY_OPTION_MIN ? (
                      <button
                        aria-label={`Remove option ${optionIndex + 1}`}
                        className="polls-icon-button polls-icon-button-danger"
                        onClick={() => removeOption(question.id, option.id)}
                        title="Remove"
                        type="button"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </BuilderSettingRow>
              ))}
            </div>
            {question.options.length < SURVEY_OPTION_MAX ? (
              <button
                className="secondary-button admin-survey-add-button"
                onClick={() => addOption(question.id)}
                type="button"
              >
                Add Option
              </button>
            ) : null}
          </section>
        ))}
      </div>

      {normalized.questions.length < SURVEY_QUESTION_MAX ? (
        <button className="secondary-button admin-survey-add-button" onClick={addQuestion} type="button">
          Add Question
        </button>
      ) : null}
    </div>
  );
}
