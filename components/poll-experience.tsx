"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import logoBanner from "@/images/logo_normie_3_1600x500.png";

type PollOption = {
  id: string;
  label: string;
};

type CurrentPoll = {
  id: string;
  question: string;
  options: PollOption[];
};

type PreviousPoll = {
  id: string;
  question: string;
  totalResponses: number;
  options: Array<PollOption & { votes: number; percentage: number }>;
};

type PollPayload = {
  done: boolean;
  currentPoll: CurrentPoll | null;
  previousPoll: PreviousPoll | null;
  error?: string;
};

function formatDisplayCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return String(value);
}

export function PollExperience({ bare = false }: { bare?: boolean } = {}) {
  const [payload, setPayload] = useState<PollPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreviousDetails, setShowPreviousDetails] = useState(false);

  async function loadPolls() {
    setIsLoading(true);
    setError(null);

    try {
      const category = new URLSearchParams(window.location.search).get("category");
      const url = category
        ? `/api/polls/next?category=${encodeURIComponent(category)}`
        : "/api/polls/next";
      const response = await fetch(url, { cache: "no-store" });
      const data = (await response.json()) as PollPayload;

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load the poll.");
      }

      setPayload(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load the poll.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPolls();
  }, []);

  async function submitAnswer(optionId: string) {
    if (!payload?.currentPoll) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/polls/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pollId: payload.currentPoll.id,
          optionId
        })
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save your answer.");
      }

      await loadPolls();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save your answer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const pollBody = (
    <>
      {error ? <div className="notice error">{error}</div> : null}

      {isLoading ? (
        <div className="notice">Loading polls...</div>
      ) : payload?.done ? (
        <div className="notice success">You&apos;re done. Thanks for finishing the full poll sequence.</div>
      ) : payload?.currentPoll ? (
        <section className="poll-grid">
          <article className="panel action-panel">
            <div className="panel-label">Current Poll</div>
            <h2 className="poll-question">{payload.currentPoll.question}</h2>
            <div className="option-list">
              {payload.currentPoll.options.map((option) => (
                <button
                  className="option-button"
                  key={option.id}
                  onClick={() => void submitAnswer(option.id)}
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

          <article className="panel result-panel">
            <div className="panel-label">Previous Results</div>
            {payload.previousPoll ? (
              <>
                <h2 className="poll-question">{payload.previousPoll.question}</h2>
                <p className="panel-copy">
                  {formatDisplayCount(payload.previousPoll.totalResponses)} total response
                  {payload.previousPoll.totalResponses === 1 ? "" : "s"}
                </p>
                <div className="result-list">
                  {payload.previousPoll.options.map((option) => (
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
                  onClick={() => setShowPreviousDetails((current) => !current)}
                  type="button"
                >
                  Dive Deeper
                </button>
                {showPreviousDetails ? (
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
                  Each screen invites you into the next question while showing the community
                  response to the previous prompt.
                </p>
              </>
            )}
          </article>
        </section>
      ) : (
        <div className="notice">No published polls are available yet.</div>
      )}
    </>
  );

  if (bare) {
    return pollBody;
  }

  return (
    <main className="page-shell">
      <section className="hero hero-card">
        <div className="hero-top-row">
          <div className="hero-logo-group">
            <div className="hero-logo-shell hero-banner-shell">
              <div className="hero-logo-card hero-banner-card">
                <Image src={logoBanner} alt="Normie banner" className="hero-logo hero-banner" priority />
              </div>
            </div>
            <div className="page-eyebrow hero-logo-caption">Personality Polls</div>
          </div>
          <div className="hero-copy hero-copy-compact">
            <p className="page-copy">
              Explore what people believe. Discover where you align. And keep answering questions
              designed to spark awareness and perspective.
            </p>
            <div className="hero-chip-row">
              <span className="hero-chip chip-sky">Knowledge</span>
              <span className="hero-chip chip-gold">Awareness</span>
              <span className="hero-chip chip-cloud">Growth</span>
            </div>
          </div>
        </div>
        <div className="hero-headline-row">
          <h1>Curiosity with a pulse.</h1>
        </div>
      </section>

      {pollBody}

      <section className="solo-info-row">
        <article className="intro-panel intro-panel-yellow solo-info-panel">
          <div className="panel-label">Why It Feels Different</div>
          <p className="panel-copy">
            Instead of isolated polls, the experience becomes a guided sequence that builds
            curiosity and reflection one question at a time.
          </p>
          <div className="orb-row">
            <span className="orb orb-blue" />
            <span className="orb orb-yellow" />
            <span className="orb orb-white" />
          </div>
        </article>
      </section>
    </main>
  );
}
