"use client";

import { useCallback, useEffect, useState } from "react";
import { PlayerGameReminderDiagnosticsGate } from "@/components/player-game-reminder-diagnostics-gate";
import { PlayerGameRemindersInline, PlayerGameRemindersPopup } from "@/components/player-game-reminders";
import type { PlayerGameReminderState } from "@/lib/player-game-reminders";

export const PLAYER_GAME_REMINDERS_REFRESH_EVENT = "normie-reminders-refresh";

const emptyState: PlayerGameReminderState = {
  bundle: { popupReminders: [], inlineReminders: [] },
  diagnostics: {
    loadedAt: new Date(0).toISOString(),
    playerId: null,
    evaluationSource: "empty",
    sessionId: null,
    loadError: null,
    activeReminderCount: 0,
    context: {
      pollsTaken: 0,
      loginCount: 0,
      isRegistered: false,
      answeredPollIds: []
    },
    reminders: [],
    matchedPopupCount: 0,
    matchedInlineCount: 0,
    visiblePopupCount: 0,
    visibleInlineCount: 0
  }
};

export function PlayerGameRemindersHost() {
  const [state, setState] = useState<PlayerGameReminderState>(emptyState);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshReminders = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const response = await fetch("/api/player/reminders", { cache: "no-store" });
      const data = (await response.json()) as PlayerGameReminderState & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load reminders.");
      }

      setState(data);
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : "Failed to load reminders.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshReminders();
  }, [refreshReminders]);

  useEffect(() => {
    const handleRefresh = () => {
      void refreshReminders();
    };

    window.addEventListener(PLAYER_GAME_REMINDERS_REFRESH_EVENT, handleRefresh);
    return () => {
      window.removeEventListener(PLAYER_GAME_REMINDERS_REFRESH_EVENT, handleRefresh);
    };
  }, [refreshReminders]);

  return (
    <>
      <PlayerGameRemindersInline reminders={state.bundle.inlineReminders} />
      <PlayerGameRemindersPopup reminders={state.bundle.popupReminders} />
      <PlayerGameReminderDiagnosticsGate
        diagnostics={{
          ...state.diagnostics,
          loadError: state.diagnostics.loadError ?? fetchError
        }}
        isLoading={isLoading}
      />
    </>
  );
}
