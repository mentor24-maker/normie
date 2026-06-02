import { isLocalDevHost } from "@/lib/local-dev-host";
import { POLL_TEST_MODE_COOKIE, POLL_TEST_PROGRESS_COOKIE } from "@/lib/poll-test-mode";

export function isPublicDiagnosticsHost(host: string): boolean {
  return isLocalDevHost(host);
}

export function isPublicSitePath(pathname: string): boolean {
  return !pathname.startsWith("/admin") && !pathname.startsWith("/portal");
}

export function shouldShowPublicPageDiagnostics(host: string, pathname: string): boolean {
  return isPublicDiagnosticsHost(host) && isPublicSitePath(pathname);
}

export function readPollTestModeFromDocument(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  return document.cookie.split(";").some((part) => part.trim() === `${POLL_TEST_MODE_COOKIE}=1`);
}

export function readPollTestProgressFromDocument(): number | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${POLL_TEST_PROGRESS_COOKIE}=`));

  if (!match) {
    return null;
  }

  const parsed = Number(match.slice(POLL_TEST_PROGRESS_COOKIE.length + 1));

  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null;
}

export function truncateDiagnosticId(value: string | null, visibleChars = 8): string {
  if (!value) {
    return "—";
  }

  if (value.length <= visibleChars * 2 + 1) {
    return value;
  }

  return `${value.slice(0, visibleChars)}…${value.slice(-visibleChars)}`;
}
