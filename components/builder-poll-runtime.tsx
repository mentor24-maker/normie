"use client";

import { useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import {
  buildPollsNextRequestUrl,
  getPollCategoryMeta,
  stripStartPollFromBrowserUrl
} from "@/lib/poll-categories";
import { getPollDoneMessage } from "@/lib/poll-done-copy";
import { getPollPodAppearanceStyle, type PollPodType } from "@/lib/poll-pod-config";
import { getCurrentPollModuleShellStyle } from "@/lib/current-poll-module";
import { getModuleWidthShellStyle } from "@/components/builder/builder-utils";
import { CurrentPollPanel } from "@/src/site/home/partials/current-poll-panel";
import { PreviousResultsPanel } from "@/src/site/home/partials/previous-results-panel";
import { rememberPollSessionFromPayload } from "@/lib/poll-session-backup-client";
import { POLL_TEST_MODE_CHANGED_EVENT } from "@/lib/poll-answer-client";
import { subscribePlayerPreferencesUpdated } from "@/lib/player-preferences-events";
import { runPollAnswerSideEffects } from "@/lib/poll-answer-effects";
import type { PollAnswerClientPayload } from "@/lib/poll-answer-client";
import { POLL_LIKE_DISLIKE_FEATURE_KEY } from "@/lib/player-unlocked-features";
import type { PollReactionKind } from "@/lib/poll-reaction";
import { PLAYER_GAME_REMINDERS_REFRESH_EVENT } from "@/lib/player-reminder-events";
import type { PollPayload } from "@/src/site/home/types";
import { SocialShareBar } from "@/components/social-share-module";

type PollRuntimeState = {
  payload: PollPayload | null;
  isLoading: boolean;
  isSubmitting: boolean;
  isReacting: boolean;
  error: string | null;
};

type PollModuleKind = "previous-results" | "current-poll";

function getPollModuleLabel(kind: PollModuleKind) {
  return kind === "previous-results" ? "Poll Slider" : "Current Question";
}

const initialState: PollRuntimeState = {
  payload: null,
  isLoading: true,
  isSubmitting: false,
  isReacting: false,
  error: null
};

let runtimeState: PollRuntimeState = initialState;
let isLoadingPromise: Promise<void> | null = null;
let loadedCategoryKey: string | null = null;
let loadedStartPollKey: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function setRuntimeState(nextState: PollRuntimeState) {
  runtimeState = nextState;
  emit();
}

async function loadPolls(
  categoryParam: string,
  startPollParam: string,
  options?: { force?: boolean }
) {
  const categoryKey = categoryParam ?? "";
  const startKey = startPollParam ?? "";

  if (options?.force) {
    loadedCategoryKey = null;
    loadedStartPollKey = null;
    isLoadingPromise = null;
    setRuntimeState({
      payload: null,
      isLoading: true,
      isSubmitting: false,
      isReacting: false,
      error: null
    });
  } else if (isLoadingPromise && loadedCategoryKey === categoryKey && loadedStartPollKey === startKey) {
    return isLoadingPromise;
  }

  loadedCategoryKey = categoryKey;
  loadedStartPollKey = startKey;

  isLoadingPromise = (async () => {
    const showLoading = options?.force || !runtimeState.payload;

    const holdCurrentLayout = Boolean(runtimeState.payload?.currentPoll && !runtimeState.payload.done);

    setRuntimeState({
      ...runtimeState,
      isLoading: showLoading,
      error: null,
      ...(options?.force && !holdCurrentLayout ? { payload: null } : {})
    });

    try {
      const response = await fetch(
        buildPollsNextRequestUrl(categoryParam || null, startKey || null),
        { cache: "no-store" }
      );
      const data = (await response.json()) as PollPayload;

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load the poll.");
      }

      rememberPollSessionFromPayload(data.pollSessionId);
      setRuntimeState({
        payload: data,
        isLoading: false,
        isSubmitting: false,
        isReacting: false,
        error: null
      });
    } catch (loadError) {
      setRuntimeState({
        ...runtimeState,
        isLoading: false,
        isSubmitting: false,
        isReacting: false,
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

    const data = (await response.json()) as PollAnswerClientPayload & { error?: string };

    if (!response.ok) {
      throw new Error(
        data.error ??
          (response.status === 429 ? "Too many answers in a short time. Please wait and try again." : "Failed to save your answer.")
      );
    }

    await runPollAnswerSideEffects(data);

    stripStartPollFromBrowserUrl();
    await loadPolls(loadedCategoryKey ?? "", "", { force: true });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(PLAYER_GAME_REMINDERS_REFRESH_EVENT));
    }
  } catch (submitError) {
    setRuntimeState({
      ...runtimeState,
      isSubmitting: false,
      error: submitError instanceof Error ? submitError.message : "Failed to save your answer."
    });
  } finally {
    setRuntimeState({
      ...runtimeState,
      isSubmitting: false
    });
  }
}

async function submitPollReaction(reaction: PollReactionKind) {
  const previousPoll = runtimeState.payload?.previousPoll;

  if (!previousPoll || previousPoll.playerReaction) {
    return;
  }

  setRuntimeState({
    ...runtimeState,
    isReacting: true,
    error: null
  });

  try {
    const response = await fetch("/api/polls/reaction", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        pollId: previousPoll.id,
        reaction
      })
    });

    const data = (await response.json()) as { error?: string; reaction?: PollReactionKind };

    if (!response.ok) {
      throw new Error(data.error ?? "Failed to save your reaction.");
    }

    setRuntimeState({
      ...runtimeState,
      isReacting: false,
      payload: runtimeState.payload
        ? {
            ...runtimeState.payload,
            previousPoll: runtimeState.payload.previousPoll
              ? {
                  ...runtimeState.payload.previousPoll,
                  playerReaction: data.reaction ?? reaction
                }
              : null
          }
        : null
    });
  } catch (reactError) {
    setRuntimeState({
      ...runtimeState,
      isReacting: false,
      error: reactError instanceof Error ? reactError.message : "Failed to save your reaction."
    });
  }
}

function useSharedPollRuntime(categoryParam: string, startPollParam: string) {
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
    void loadPolls(categoryParam, startPollParam);
  }, [categoryParam, startPollParam]);

  useEffect(() => {
    return subscribePlayerPreferencesUpdated(() => {
      void loadPolls(categoryParam, startPollParam, { force: true });
    });
  }, [categoryParam, startPollParam]);

  useEffect(() => {
    const reloadForTestMode = () => {
      void loadPolls(categoryParam, startPollParam, { force: true });
    };

    window.addEventListener(POLL_TEST_MODE_CHANGED_EVENT, reloadForTestMode);
    return () => window.removeEventListener(POLL_TEST_MODE_CHANGED_EVENT, reloadForTestMode);
  }, [categoryParam, startPollParam]);

  return {
    ...state,
    reload: () => loadPolls(categoryParam, startPollParam, { force: true }),
    submitAnswer,
    submitPollReaction
  };
}

export function BuilderPollModuleRuntime({
  kind,
  className,
  settings = {}
}: {
  kind: PollModuleKind;
  className?: string;
  settings?: Record<string, string>;
}) {
  const searchParams = useSearchParams();
  const categoryParam = searchParams?.get("category")?.trim() ?? "";
  const startPollParam = searchParams?.get("startPoll")?.trim() ?? "";
  const { error, isLoading, isReacting, isSubmitting, payload, submitAnswer: onSubmit, submitPollReaction } =
    useSharedPollRuntime(categoryParam, startPollParam);
  const showPollReactions = Boolean(payload?.unlockedFeatures?.includes(POLL_LIKE_DISLIKE_FEATURE_KEY));
  const categoryFromUrl = getPollCategoryMeta(categoryParam);
  const activeCategory = payload?.activeCategory ?? categoryFromUrl;
  const shellStyle =
    kind === "current-poll" ? getCurrentPollModuleShellStyle(settings) : getModuleWidthShellStyle(settings);
  const builderPodType: PollPodType =
    kind === "previous-results"
      ? payload?.previousPoll
        ? "previous_results"
        : "initial_page"
      : "polls";
  const panelStyle = getPollPodAppearanceStyle(payload?.settings, builderPodType);
  const panelClassName = className ? `${className} panel poll-module-panel` : "panel poll-module-panel";

  function wrapPollModule(content: ReactNode) {
    return (
      <div className="builder-poll-module-shell" style={shellStyle}>
        {content}
      </div>
    );
  }

  if (isLoading && !payload?.currentPoll && (!payload || payload.done)) {
    return wrapPollModule(
      <article className={panelClassName} style={panelStyle}>
        <div className="panel-label">{getPollModuleLabel(kind)}</div>
        <p className="panel-copy">Loading polls...</p>
      </article>
    );
  }

  if (error) {
    return wrapPollModule(
      <article className={panelClassName} style={panelStyle}>
        <div className="panel-label">{getPollModuleLabel(kind)}</div>
        <p className="panel-copy">{error}</p>
      </article>
    );
  }

  if (payload?.done) {
    return wrapPollModule(
      <article className={panelClassName} style={panelStyle}>
        <div className="panel-label">{getPollModuleLabel(kind)}</div>
        <p className="panel-copy">{getPollDoneMessage(payload.doneReason)}</p>
      </article>
    );
  }

  if (kind === "previous-results") {
    return wrapPollModule(
      <PreviousResultsPanel
        isReacting={isReacting}
        onReact={submitPollReaction}
        playerReaction={payload?.previousPoll?.playerReaction ?? null}
        previousPoll={payload?.previousPoll ?? null}
        settings={payload?.settings}
        showPollReactions={showPollReactions}
      />
    );
  }

  if (payload?.currentPoll) {
    return wrapPollModule(
      <CurrentPollPanel
        currentPoll={payload.currentPoll}
        isAwaitingNextPoll={isLoading}
        isSubmitting={isSubmitting}
        moduleSettings={settings}
        onSubmit={onSubmit}
        settings={payload.settings}
      />
    );
  }

  return wrapPollModule(
    <article className={panelClassName} style={panelStyle}>
      <div className="panel-label">Current Question</div>
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
  const startPollParam = searchParams?.get("startPoll")?.trim() ?? "";
  const { error, isLoading, payload } = useSharedPollRuntime(categoryParam, startPollParam);

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
