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
import { POLL_SKIP_FEATURE_KEY, POLL_LIKE_DISLIKE_FEATURE_KEY } from "@/lib/player-unlocked-features";
import type { PollReactionKind } from "@/lib/poll-reaction";
import type { PollPayload } from "@/src/site/home/types";

type UsePollExperienceOptions = {
  onAnswered?: (result: PollAnswerResult) => void;
  onReacted?: (result: { reaction: PollReactionKind; tokensEarned?: number; duplicate?: boolean }) => void;
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
  const [isSubmittingSurvey, setIsSubmittingSurvey] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPolls = useCallback(
    async (options?: { category?: string; startPoll?: string; reset?: boolean }) => {
      setError(null);

      let showLoading = false;

      setPayload((current) => {
        showLoading = true;

        if ((current?.currentPoll || current?.surveyInterstitial) && !current.done) {
          return current;
        }

        if (options?.reset || current?.done || !current) {
          return null;
        }

        return current;
      });

      if (showLoading) {
        setIsLoading(true);
      }

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

  async function submitSurveyInterstitial(answers: Record<string, string>) {
    if (!payload?.surveyInterstitial) {
      return;
    }

    setIsSubmittingSurvey(true);
    setError(null);

    try {
      const response = await fetch("/api/polls/interstitial-survey", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          interstitialId: payload.surveyInterstitial.id,
          answers
        })
      });

      const data = (await response.json()) as { error?: string; ok?: boolean };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save your survey responses.");
      }

      await loadPolls({ reset: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save your survey responses.");
    } finally {
      setIsSubmittingSurvey(false);
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

  async function submitPollReaction(reaction: PollReactionKind) {
    if (!payload?.previousPoll || payload.previousPoll.playerReaction) {
      return;
    }

    setIsReacting(true);
    setError(null);

    try {
      const response = await fetch("/api/polls/reaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pollId: payload.previousPoll.id,
          reaction
        })
      });

      const data = (await response.json()) as PollAnswerResult & {
        reaction?: PollReactionKind;
        tokensEarned?: number;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save your reaction.");
      }

      setPayload((current) => {
        if (!current?.previousPoll) {
          return current;
        }

        return {
          ...current,
          previousPoll: {
            ...current.previousPoll,
            playerReaction: data.reaction ?? reaction
          }
        };
      });

      options?.onReacted?.({
        reaction: data.reaction ?? reaction,
        tokensEarned: data.tokensEarned,
        duplicate: data.duplicate
      });
    } catch (reactError) {
      setError(reactError instanceof Error ? reactError.message : "Failed to save your reaction.");
    } finally {
      setIsReacting(false);
    }
  }

  const categoryFromUrl = getPollCategoryMeta(categoryParam);

  return {
    activeCategory: payload?.activeCategory ?? categoryFromUrl,
    error,
    isLoading,
    isReacting,
    isSubmitting,
    isSubmittingSurvey,
    payload,
    showPollReactions: Boolean(payload?.unlockedFeatures?.includes(POLL_LIKE_DISLIKE_FEATURE_KEY)),
    showSkipPoll: Boolean(payload?.unlockedFeatures?.includes(POLL_SKIP_FEATURE_KEY)),
    skipCurrentPoll,
    submitAnswer,
    submitPollReaction,
    submitSurveyInterstitial
  };
}
