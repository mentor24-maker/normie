"use client";

import { useState } from "react";
import type { PreviousPoll } from "@/src/site/home/types";

type PreviousResultsPanelProps = {
  previousPoll: PreviousPoll | null;
};

function formatDisplayCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return String(value);
}

export function PreviousResultsPanel({ previousPoll }: PreviousResultsPanelProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <article className="panel result-panel">
      <div className="panel-label">Previous Results</div>
      {previousPoll ? (
        <>
          <h2 className="poll-question">{previousPoll.question}</h2>
          <p className="panel-copy">
            {formatDisplayCount(previousPoll.totalResponses)} total response
            {previousPoll.totalResponses === 1 ? "" : "s"}
          </p>
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
          <button
            className="dive-deeper-toggle"
            onClick={() => setShowDetails((current) => !current)}
            type="button"
          >
            Dive Deeper
          </button>
          {showDetails ? (
            <div className="dive-deeper-panel">
              <a href="#">Video</a>
              <a href="#">Articles</a>
              <a href="#">Discussion</a>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="panel-label">How It Works</div>
          <h2 className="poll-question">Vote left, watch the story unfold on the right.</h2>
          <p className="panel-copy">
            Each screen invites you into the next question while showing the community response to
            the previous prompt.
          </p>
        </>
      )}
    </article>
  );
}
