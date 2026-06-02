"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  buildPollsNextRequestUrl,
  getPollCategoryMeta,
  stripStartPollFromBrowserUrl
} from "@/lib/poll-categories";
import { runPollAnswerSideEffects } from "@/lib/poll-answer-effects";
import type { PollAnswerClientPayload } from "@/lib/poll-test-mode";
import { subscribePlayerPreferencesUpdated } from "@/lib/player-preferences-events";
import { rememberPollSessionFromPayload } from "@/lib/poll-session-backup-client";
import { POLL_TEST_MODE_CHANGED_EVENT } from "@/lib/poll-test-mode";
import { POLL_SKIP_FEATURE_KEY } from "@/lib/player-unlocked-features";
import type { PollPayload } from "@/src/site/home/types";

type UsePollExperienceOptions = {
  onAnswered?: (result: PollAnswerResult) => void;
};

export type PollAnswerResult = PollAnswerClientPayload & {
  ok?: boolean;
  code?: string;
  error?: string;
  claimed?: boolean;
  levelUp?: boolean;
};

export function usePollExperience(options?: UsePollExperienceOptions) {
  const searchParams = useSearchParams();
  const categoryParam = searchParams?.get("category")?.trim() ?? "";
  const startPollParam = searchParams?.get("startPoll")?.trim() ?? "";
  const [payload, setPayload] = useState<PollPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPolls = useCallback(
    async (options?: { category?: string; startPoll?: string; reset?: boolean }) => {
      setIsLoading(true);
      setError(null);
      setPayload((current) => (current?.done || options?.reset ? null : current));

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
    return subscribePlayerPreferencesUpdated(() => {
      void loadPolls({ reset: true });
    });
  }, [loadPolls]);

  useEffect(() => {
    const reloadForTestMode = () => {
      void loadPolls({ reset: true });
    };

    window.addEventListener(POLL_TEST_MODE_CHANGED_EVENT, reloadForTestMode);
    return () => window.removeEventListener(POLL_TEST_MODE_CHANGED_EVENT, reloadForTestMode);
  }, [loadPolls]);

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

      const data = (await response.json()) as PollAnswerResult;

      if (!response.ok) {
        throw new Error(
          data.error ??
            (response.status === 429 ? "Too many answers in a short time. Please wait and try again." : "Failed to save your answer.")
        );
      }

      stripStartPollFromBrowserUrl();

      await runPollAnswerSideEffects(data);

      options?.onAnswered?.(data);
      await loadPolls({ startPoll: "", reset: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save your answer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function skipCurrentPoll() {
    if (!payload?.currentPoll) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/polls/skip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pollId: payload.currentPoll.id
        })
      });

      const data = (await response.json()) as PollAnswerResult & { skipped?: boolean };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to skip this poll.");
      }

      stripStartPollFromBrowserUrl();
      options?.onAnswered?.(data);
      await loadPolls({ startPoll: "" });
    } catch (skipError) {
      setError(skipError instanceof Error ? skipError.message : "Failed to skip this poll.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const categoryFromUrl = getPollCategoryMeta(categoryParam);

  return {
    activeCategory: payload?.activeCategory ?? categoryFromUrl,
    error,
    isLoading,
    isSubmitting,
    payload,
    showSkipPoll: Boolean(payload?.unlockedFeatures?.includes(POLL_SKIP_FEATURE_KEY)),
    skipCurrentPoll,
    submitAnswer
  };
}
