import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  buildPollsNextRequestUrl,
  getPollCategoryMeta,
  stripStartPollFromBrowserUrl
} from "@/lib/poll-categories";
import logoBanner from "@/images/logo_normie_3_1600x500.png";
import { PollCategoryHeadline } from "@/src/site/home/partials/poll-category-headline";
import { CurrentPollPanel } from "@/src/site/home/partials/current-poll-panel";
import { PreviousResultsPanel } from "@/src/site/home/partials/previous-results-panel";
import { runPollAnswerSideEffects } from "@/lib/poll-answer-effects";
import type { PollAnswerClientPayload } from "@/lib/poll-test-mode";
import { getPollDoneMessage } from "@/lib/poll-done-copy";
import { getPollGridStyle } from "@/lib/poll-pod-config";
import { rememberPollSessionFromPayload } from "@/lib/poll-session-backup-client";
import { POLL_TEST_MODE_CHANGED_EVENT } from "@/lib/poll-test-mode";
import type { PollPayload } from "@/src/site/home/types";

export function PollExperience({ bare = false }: { bare?: boolean } = {}) {
  const searchParams = useSearchParams();
  const categoryParam = searchParams?.get("category")?.trim() ?? "";
  const startPollParam = searchParams?.get("startPoll")?.trim() ?? "";
  const [payload, setPayload] = useState<PollPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeCategory = payload?.activeCategory ?? getPollCategoryMeta(categoryParam);

  const loadPolls = useCallback(
    async (options?: { category?: string; startPoll?: string }) => {
      setIsLoading(true);
      setError(null);

      const category = (options?.category ?? categoryParam).trim();
      const startPoll = (options?.startPoll ?? startPollParam).trim();

      try {
        const response = await fetch(
          buildPollsNextRequestUrl(category || null, startPoll || null),
          { cache: "no-store" }
        );
        const data = (await response.json()) as PollPayload;

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load the poll.");
        }

        rememberPollSessionFromPayload(data.pollSessionId);
        setPayload(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load the poll.");
      } finally {
        setIsLoading(false);
      }
    },
    [categoryParam, startPollParam]
  );

  useEffect(() => {
    void loadPolls();
  }, [loadPolls]);

  useEffect(() => {
    const reloadForTestMode = () => {
      void loadPolls({ startPoll: "" });
    };

    window.addEventListener(POLL_TEST_MODE_CHANGED_EVENT, reloadForTestMode);
    return () => window.removeEventListener(POLL_TEST_MODE_CHANGED_EVENT, reloadForTestMode);
  }, [loadPolls]);

  async function submitAnswer(optionId: string) {
    if (!payload?.currentPoll) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/polls/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId: payload.currentPoll.id, optionId })
      });

      const data = (await response.json()) as PollAnswerClientPayload & { error?: string };

      if (!response.ok) {
        throw new Error(
          data.error ??
            (response.status === 429 ? "Too many answers in a short time. Please wait and try again." : "Failed to save your answer.")
        );
      }

      await runPollAnswerSideEffects(data);

      stripStartPollFromBrowserUrl();
      await loadPolls({ startPoll: "" });
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
        <div className="notice success">{getPollDoneMessage(payload.doneReason)}</div>
      ) : payload?.currentPoll ? (
        <>
          <section className="poll-grid" style={getPollGridStyle(payload.settings)}>
            {activeCategory ? (
              <div className="poll-grid-category-row">
                <PollCategoryHeadline category={activeCategory} />
              </div>
            ) : null}
            <CurrentPollPanel
              currentPoll={payload.currentPoll}
              isSubmitting={isSubmitting}
              onSubmit={submitAnswer}
              settings={payload.settings}
            />

            <PreviousResultsPanel
              previousPoll={payload.previousPoll}
              settings={payload.settings}
            />
          </section>
        </>
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
