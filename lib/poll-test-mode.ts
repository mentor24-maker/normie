import { isLocalDevHost } from "@/lib/local-dev-host";
import type { PlayerReminderContext } from "@/lib/game-reminder-eval";
import { isUuid } from "@/lib/public-request";

export {
  POLL_TEST_MODE_CHANGED_EVENT,
  resolvePollAnswerProgress,
  shouldFirePollAnswerEffects,
  type PollAnswerClientPayload
} from "@/lib/poll-answer-client";

export const POLL_TEST_MODE_COOKIE = "normie_poll_test_mode";
export const POLL_TEST_PIN_COOKIE = "normie_poll_test_pin";
export const POLL_TEST_PROGRESS_COOKIE = "normie_poll_test_progress";

const POLL_TEST_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24;

type CookieStore = {
  get: (name: string) => { value: string } | undefined;
};

export function isLocalhostPollTestHost(host: string | null | undefined): boolean {
  return isLocalDevHost(host);
}

export function isPollTestModeEnabled(cookieStore: CookieStore): boolean {
  return cookieStore.get(POLL_TEST_MODE_COOKIE)?.value === "1";
}

export function isPollTestModeRequest(request: Request, cookieStore: CookieStore): boolean {
  if (!isLocalhostPollTestHost(request.headers.get("host"))) {
    return false;
  }

  return isPollTestModeEnabled(cookieStore);
}

export function readPollTestPin(cookieStore: CookieStore): string | null {
  const candidate = cookieStore.get(POLL_TEST_PIN_COOKIE)?.value?.trim() ?? "";

  return isUuid(candidate) ? candidate : null;
}

export function readPollTestProgress(cookieStore: CookieStore): number | null {
  const raw = cookieStore.get(POLL_TEST_PROGRESS_COOKIE)?.value?.trim() ?? "";
  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.floor(parsed);
}

export function nextPollTestProgress(current: number | null, fallbackProgress: number): number {
  const base = current ?? Math.max(0, fallbackProgress);
  return base + 1;
}

type NextResponseLike = {
  cookies: {
    set: (
      name: string,
      value: string,
      options?: {
        path?: string;
        maxAge?: number;
        sameSite?: "lax" | "strict" | "none";
        secure?: boolean;
      }
    ) => void;
  };
};

export function applyPollTestModeCookies(
  response: NextResponseLike,
  values: {
    enabled: boolean;
    pinPollId?: string | null;
    progress?: number | null;
  }
): void {
  const secure = process.env.NODE_ENV === "production";
  const cookieOptions = {
    path: "/",
    sameSite: "lax" as const,
    secure,
    maxAge: values.enabled ? POLL_TEST_COOKIE_MAX_AGE_SECONDS : 0
  };

  response.cookies.set(POLL_TEST_MODE_COOKIE, values.enabled ? "1" : "", cookieOptions);

  if (values.pinPollId && isUuid(values.pinPollId)) {
    response.cookies.set(POLL_TEST_PIN_COOKIE, values.pinPollId, cookieOptions);
  } else if (!values.enabled || values.pinPollId === null) {
    response.cookies.set(POLL_TEST_PIN_COOKIE, "", {
      ...cookieOptions,
      maxAge: values.enabled ? cookieOptions.maxAge : 0
    });
  }

  if (typeof values.progress === "number" && values.enabled) {
    response.cookies.set(POLL_TEST_PROGRESS_COOKIE, String(values.progress), cookieOptions);
  } else if (!values.enabled) {
    response.cookies.set(POLL_TEST_PROGRESS_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  }
}

/** Treat the pinned poll as unanswered so the same question reloads on refresh. */
export function excludePinnedPollFromAnswered(answeredPollIds: Set<string>, pinPollId: string | null): void {
  if (pinPollId) {
    answeredPollIds.delete(pinPollId);
  }
}

/** Reminder criteria use DB history; in test mode use the simulated progress counter instead. */
export function applyPollTestReminderContextOverrides(
  context: PlayerReminderContext,
  cookieStore: CookieStore,
  host: string | null | undefined
): PlayerReminderContext {
  if (!isLocalhostPollTestHost(host) || !isPollTestModeEnabled(cookieStore)) {
    return context;
  }

  const testProgress = readPollTestProgress(cookieStore);

  return {
    ...context,
    pollsTaken: testProgress ?? context.pollsTaken,
    isRegistered: false
  };
}
