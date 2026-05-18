"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  buildPollsNextRequestUrl,
  getPollCategoryMeta,
  stripStartPollFromBrowserUrl
} from "@/lib/poll-categories";
import type { PollPayload } from "@/src/site/home/types";

export function usePollExperience() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams?.get("category")?.trim() ?? "";
  const startPollParam = searchParams?.get("startPoll")?.trim() ?? "";
  const [payload, setPayload] = useState<PollPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const data = (await response.json()) as { error?: string; code?: string };

      if (!response.ok) {
        throw new Error(
          data.error ??
            (response.status === 429 ? "Too many answers in a short time. Please wait and try again." : "Failed to save your answer.")
        );
      }

      stripStartPollFromBrowserUrl();
      await loadPolls({ startPoll: "" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save your answer.");
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
    submitAnswer
  };
}
