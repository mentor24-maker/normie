"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { buildPollsNextRequestUrl, getPollCategoryMeta } from "@/lib/poll-categories";
import { CurrentPollPanel } from "@/src/site/home/partials/current-poll-panel";
import { PreviousResultsPanel } from "@/src/site/home/partials/previous-results-panel";
import type { PollPayload } from "@/src/site/home/types";
import { SocialShareBar } from "@/components/social-share-module";

type PollRuntimeState = {
  payload: PollPayload | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
};

type PollModuleKind = "previous-results" | "current-poll";

function getPollModuleLabel(kind: PollModuleKind) {
  return kind === "previous-results" ? "Poll Slider" : "Current Poll";
}

const initialState: PollRuntimeState = {
  payload: null,
  isLoading: true,
  isSubmitting: false,
  error: null
};

let runtimeState: PollRuntimeState = initialState;
let isLoadingPromise: Promise<void> | null = null;
let loadedCategoryKey: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function setRuntimeState(nextState: PollRuntimeState) {
  runtimeState = nextState;
  emit();
}

async function loadPolls(categoryParam: string) {
  if (isLoadingPromise && loadedCategoryKey === categoryParam) {
    return isLoadingPromise;
  }

  loadedCategoryKey = categoryParam;

  isLoadingPromise = (async () => {
    setRuntimeState({
      ...runtimeState,
      isLoading: true,
      error: null
    });

    try {
      const response = await fetch(buildPollsNextRequestUrl(categoryParam || null), { cache: "no-store" });
      const data = (await response.json()) as PollPayload;

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load the poll.");
      }

      setRuntimeState({
        payload: data,
        isLoading: false,
        isSubmitting: false,
        error: null
      });
    } catch (loadError) {
      setRuntimeState({
        ...runtimeState,
        isLoading: false,
        isSubmitting: false,
        error: loadError instanceof Error ? loadError.message : "Failed to load the poll."
      });
    } finally {
      isLoadingPromise = null;
    }
  })();

  return isLoadingPromise;
}

async function submitAnswer(optionId: string) {
  const currentPoll = runtimeState.payload?.currentPoll;

  if (!currentPoll) {
    return;
  }

  setRuntimeState({
    ...runtimeState,
    isSubmitting: true,
    error: null
  });

  try {
    const response = await fetch("/api/polls/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        pollId: currentPoll.id,
        optionId
      })
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      throw new Error(
        data.error ??
          (response.status === 429 ? "Too many answers in a short time. Please wait and try again." : "Failed to save your answer.")
      );
    }

    await loadPolls(loadedCategoryKey ?? "");
  } catch (submitError) {
    setRuntimeState({
      ...runtimeState,
      isSubmitting: false,
      error: submitError instanceof Error ? submitError.message : "Failed to save your answer."
    });
  }
}

function useSharedPollRuntime(categoryParam: string) {
  const [state, setState] = useState(runtimeState);

  useEffect(() => {
    const sync = () => setState(runtimeState);
    listeners.add(sync);
    sync();

    return () => {
      listeners.delete(sync);
    };
  }, []);

  useEffect(() => {
    void loadPolls(categoryParam);
  }, [categoryParam]);

  return {
    ...state,
    reload: () => loadPolls(categoryParam),
    submitAnswer
  };
}

export function BuilderPollModuleRuntime({
  kind,
  className
}: {
  kind: PollModuleKind;
  className?: string;
}) {
  const searchParams = useSearchParams();
  const categoryParam = searchParams?.get("category")?.trim() ?? "";
  const { error, isLoading, isSubmitting, payload, submitAnswer: onSubmit } = useSharedPollRuntime(categoryParam);
  const categoryFromUrl = getPollCategoryMeta(categoryParam);
  const activeCategory = payload?.activeCategory ?? categoryFromUrl;

  if (isLoading) {
    return (
      <article className={className ? `${className} panel` : "panel"}>
        <div className="panel-label">{getPollModuleLabel(kind)}</div>
        <p className="panel-copy">Loading polls...</p>
      </article>
    );
  }

  if (error) {
    return (
      <article className={className ? `${className} panel` : "panel"}>
        <div className="panel-label">{getPollModuleLabel(kind)}</div>
        <p className="panel-copy">{error}</p>
      </article>
    );
  }

  if (payload?.done) {
    return (
      <article className={className ? `${className} panel` : "panel"}>
        <div className="panel-label">{getPollModuleLabel(kind)}</div>
        <p className="panel-copy">
          {activeCategory
            ? `You&apos;re done with the ${activeCategory.name} polls. Thanks for playing.`
            : "You&apos;re done. Thanks for finishing the full poll sequence."}
        </p>
      </article>
    );
  }

  if (kind === "previous-results") {
    return (
      <div className={className}>
        <PreviousResultsPanel previousPoll={payload?.previousPoll ?? null} />
      </div>
    );
  }

  if (payload?.currentPoll) {
    return (
      <div className={className}>
        <CurrentPollPanel currentPoll={payload.currentPoll} isSubmitting={isSubmitting} onSubmit={onSubmit} />
      </div>
    );
  }

  return (
    <article className={className ? `${className} panel` : "panel"}>
      <div className="panel-label">Current Poll</div>
      <p className="panel-copy">
        {activeCategory ? `No published polls are available in ${activeCategory.name} yet.` : "No published polls are available yet."}
      </p>
    </article>
  );
}

export function BuilderSocialShareRuntime({
  settings,
  className
}: {
  settings: Record<string, string>;
  className?: string;
}) {
  const searchParams = useSearchParams();
  const categoryParam = searchParams?.get("category")?.trim() ?? "";
  const { error, isLoading, payload } = useSharedPollRuntime(categoryParam);

  if (isLoading) {
    return (
      <div className={className}>
        <div className="poll-share-bar">
          <span className="poll-share-label">Loading share links...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return settings.shareShowErrors === "true" ? (
      <div className={className}>
        <p className="panel-copy">{error}</p>
      </div>
    ) : null;
  }

  return (
    <div className={className}>
      <SocialShareBar settings={settings} poll={payload?.currentPoll ?? null} />
    </div>
  );
}
