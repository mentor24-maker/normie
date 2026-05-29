export const PLAYER_PENDING_CONFIRMATION_STORAGE_KEY = "normie_player_pending_confirmation";

export function readPendingConfirmationEmail(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const raw = window.localStorage.getItem(PLAYER_PENDING_CONFIRMATION_STORAGE_KEY);

    if (!raw) {
      return "";
    }

    const parsed = JSON.parse(raw) as { email?: unknown };
    return String(parsed.email ?? "").trim().toLowerCase();
  } catch {
    return "";
  }
}

export function writePendingConfirmationEmail(email: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    PLAYER_PENDING_CONFIRMATION_STORAGE_KEY,
    JSON.stringify({ email: email.trim().toLowerCase() })
  );
}

export function clearPendingConfirmationEmail(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PLAYER_PENDING_CONFIRMATION_STORAGE_KEY);
}
