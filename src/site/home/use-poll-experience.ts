"use client";

import { useEffect, useState } from "react";
import type { PollPayload } from "@/src/site/home/types";

export function usePollExperience() {
  const [payload, setPayload] = useState<PollPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const data = (await response.json()) as { error?: string; code?: string };

      if (!response.ok) {
        throw new Error(
          data.error ??
            (response.status === 429 ? "Too many answers in a short time. Please wait and try again." : "Failed to save your answer.")
        );
      }

      await loadPolls();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save your answer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    error,
    isLoading,
    isSubmitting,
    payload,
    submitAnswer
  };
}
