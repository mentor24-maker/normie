"use client";

import { useEffect, useState } from "react";
import { PollDeepDiveContentView } from "@/components/poll-deep-dive-content";
import { PollReactionButtons } from "@/components/poll-reaction-buttons";
import { getPollDeepDiveOverlayPillLabel } from "@/lib/poll-deep-dive";
import type { PollReactionKind } from "@/lib/poll-reaction";
import {
  getPollPodAppearanceStyle,
  resolvePollPod
} from "@/lib/poll-pod-config";
import type { PollSettingsSnapshot, PreviousPoll } from "@/src/site/home/types";
import { PollCategoryHeadline } from "@/src/site/home/partials/poll-category-headline";

type PreviousResultsPanelProps = {
  isReacting?: boolean;
  onReact?: (reaction: PollReactionKind) => void | Promise<void>;
  playerReaction?: PollReactionKind | null;
  previousPoll: PreviousPoll | null;
  settings?: PollSettingsSnapshot | null;
  showPollReactions?: boolean;
};

function formatDisplayCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return String(value);
}

export function PreviousResultsPanel({
  isReacting = false,
  onReact,
  playerReaction = null,
  previousPoll,
  settings,
  showPollReactions = false
}: PreviousResultsPanelProps) {
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);
  const [prevPollId, setPrevPollId] = useState(previousPoll?.id);

  // Close the deep dive when a different poll is shown (adjust-during-render).
  if (prevPollId !== previousPoll?.id) {
    setPrevPollId(previousPoll?.id);
    setDeepDiveOpen(false);
  }

  const podType = previousPoll ? "previous_results" : "initial_page";
  const panelPodAppearanceStyle = getPollPodAppearanceStyle(settings, podType);
  const initialContent = resolvePollPod(settings?.pods, "initial_page").content;

  useEffect(() => {
    if (!deepDiveOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDeepDiveOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deepDiveOpen]);

  return (
    <article
      className="panel result-panel poll-module-panel poll-previous-results-panel"
      style={panelPodAppearanceStyle}
    >
      <div className="panel-label">Previous Results</div>
      <PollCategoryHeadline category={previousPoll?.category} />
      <div className="poll-question-area">
        {previousPoll ? (
          <div className="poll-previous-results-question-pod">
            <h2 className="poll-question">{previousPoll.question}</h2>
            <div className="result-list">
              {previousPoll.options.map((option) => (
                <div className="result-row" key={option.id}>
                  <div className="result-meta">
                    <span>{option.label}</span>
                    <span>
                      {formatDisplayCount(option.votes)} · {option.percentage}%
                    </span>
                  </div>
                  <div className="result-bar">
                    <div className="result-bar-fill" style={{ width: `${option.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="poll-pod-action-row">
              <button
                className="secondary-button poll-pod-action-button poll-deep-dive-trigger"
                onClick={() => setDeepDiveOpen(true)}
                type="button"
              >
                Deep Dive
              </button>
            </div>
            {showPollReactions && onReact ? (
              <PollReactionButtons
                disabled={isReacting}
                playerReaction={playerReaction}
                onReact={onReact}
              />
            ) : null}
          </div>
        ) : initialContent ? (
          <>
            {initialContent.headerLabel.trim() ? (
              <div className="panel-label">{initialContent.headerLabel}</div>
            ) : null}
            <div
              className="poll-empty-state-content blog-post-body"
              dangerouslySetInnerHTML={{ __html: initialContent.contentHtml }}
            />
          </>
        ) : null}
      </div>

      {previousPoll ? (
        <>
          {deepDiveOpen ? (
            <div
              className="poll-deep-dive-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="poll-deep-dive-title"
            >
              <div className="poll-deep-dive-overlay-header">
                <div className="poll-deep-dive-overlay-title-stack">
                  <p className="poll-deep-dive-eyebrow">Deep Dive</p>
                  <div className="poll-deep-dive-overlay-pill" id="poll-deep-dive-title">
                    {getPollDeepDiveOverlayPillLabel(previousPoll.deepDive)}
                  </div>
                </div>
                <button
                  className="poll-deep-dive-dismiss"
                  onClick={() => setDeepDiveOpen(false)}
                  type="button"
                  aria-label="Close Deep Dive and return to Previous Results"
                >
                  ×
                </button>
              </div>
              <div
                className={
                  previousPoll.deepDive.kind === "related"
                    ? "poll-deep-dive-body poll-deep-dive-body--related"
                    : "poll-deep-dive-body"
                }
              >
                <PollDeepDiveContentView content={previousPoll.deepDive} />
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </article>
  );
}
