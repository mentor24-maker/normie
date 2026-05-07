import type { PreviousPoll } from "@/src/site/home/types";

type PreviousResultsPanelProps = {
  previousPoll: PreviousPoll | null;
};

export function PreviousResultsPanel({ previousPoll }: PreviousResultsPanelProps) {
  return (
    <article className="panel result-panel">
      <div className="panel-label">Previous Results</div>
      {previousPoll ? (
        <>
          <h2>{previousPoll.question}</h2>
          <p className="panel-copy">
            {previousPoll.totalResponses} total response
            {previousPoll.totalResponses === 1 ? "" : "s"}
          </p>
          <div className="result-list">
            {previousPoll.options.map((option) => (
              <div className="result-row" key={option.id}>
                <div className="result-meta">
                  <span>{option.label}</span>
                  <span>
                    {option.votes} · {option.percentage}%
                  </span>
                </div>
                <div className="result-bar">
                  <div className="result-bar-fill" style={{ width: `${option.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="panel-label">How It Works</div>
          <h2>Look left, vote right, keep unfolding the story.</h2>
          <p className="panel-copy">
            Each screen shows the community response to the previous prompt while inviting you into
            the next one.
          </p>
        </>
      )}
    </article>
  );
}
