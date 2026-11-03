const PLAYER_LEVEL_UP_DIAGNOSTICS_KEY = "normie-level-up-diagnostics";
const MAX_PLAYER_LEVEL_UP_DIAGNOSTICS = 12;

export type PlayerLevelUpDiagnosticEvent = {
  at: string;
  event: string;
  data?: Record<string, unknown>;
};

export function appendPlayerLevelUpDiagnostic(event: string, data?: Record<string, unknown>) {
  if (typeof window === "undefined") {
    return;
  }

  const nextEvent: PlayerLevelUpDiagnosticEvent = {
    at: new Date().toISOString(),
    event,
    data
  };

  try {
    const current = readPlayerLevelUpDiagnostics();
    sessionStorage.setItem(
      PLAYER_LEVEL_UP_DIAGNOSTICS_KEY,
      JSON.stringify([nextEvent, ...current].slice(0, MAX_PLAYER_LEVEL_UP_DIAGNOSTICS))
    );
    window.dispatchEvent(new CustomEvent("normie-level-up-diagnostics"));
  } catch {
    // Diagnostics should never interfere with gameplay.
  }
}

export function readPlayerLevelUpDiagnostics(): PlayerLevelUpDiagnosticEvent[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(sessionStorage.getItem(PLAYER_LEVEL_UP_DIAGNOSTICS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed as PlayerLevelUpDiagnosticEvent[] : [];
  } catch {
    return [];
  }
}
