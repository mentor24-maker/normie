import { DISMISSED_REMINDERS_STORAGE_KEY } from "@/lib/player-game-reminder-dismissals";
import { isStoredPollSessionId, POLL_SESSION_BACKUP_STORAGE_KEY } from "@/lib/poll-session-backup-client";
import type { PollTestBrowserResetSummary } from "@/lib/poll-test-browser-reset";
import {
  POLL_TEST_MODE_COOKIE,
  POLL_TEST_PIN_COOKIE,
  POLL_TEST_PROGRESS_COOKIE
} from "@/lib/poll-test-mode";

const CLAIMED_SESSION_KEY_PREFIX = "normie_poll_session_claimed_";

export function readPollSessionBackupForReset(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = window.localStorage.getItem(POLL_SESSION_BACKUP_STORAGE_KEY);
    return isStoredPollSessionId(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearPollTestClientCookies(): void {
  if (typeof document === "undefined") {
    return;
  }

  const secure = window.location.protocol === "https:";
  const attributes = `path=/; max-age=0; samesite=lax${secure ? "; secure" : ""}`;

  for (const name of [POLL_TEST_MODE_COOKIE, POLL_TEST_PIN_COOKIE, POLL_TEST_PROGRESS_COOKIE]) {
    document.cookie = `${name}=; ${attributes}`;
  }
}

export function clearPollTestBrowserLocalStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(POLL_SESSION_BACKUP_STORAGE_KEY);
    window.localStorage.removeItem(DISMISSED_REMINDERS_STORAGE_KEY);

    const keysToRemove: string[] = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);

      if (key?.startsWith(CLAIMED_SESSION_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Private browsing or storage quota — ignore.
  }
}

export async function requestPollTestBrowserReset(): Promise<PollTestBrowserResetSummary> {
  const backupSessionId = readPollSessionBackupForReset();
  const response = await fetch("/api/dev/poll-test-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ backupSessionId }),
    cache: "no-store"
  });

  const data = (await response.json()) as PollTestBrowserResetSummary & { error?: string };

  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? "Failed to reset poll test browser data.");
  }

  clearPollTestBrowserLocalStorage();

  return data;
}
