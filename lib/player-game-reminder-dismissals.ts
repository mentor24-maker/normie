export const DISMISSED_REMINDERS_STORAGE_KEY = "normie_dismissed_game_reminders";

export function readDismissedReminderIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(DISMISSED_REMINDERS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((value) => String(value ?? "").trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function persistDismissedReminderIds(ids: string[]) {
  window.localStorage.setItem(DISMISSED_REMINDERS_STORAGE_KEY, JSON.stringify(ids));
}

export function clearDismissedReminderIds() {
  window.localStorage.removeItem(DISMISSED_REMINDERS_STORAGE_KEY);
}
