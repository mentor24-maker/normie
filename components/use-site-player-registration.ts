"use client";

import { useEffect, useState } from "react";
import { PLAYER_GAME_REMINDERS_REFRESH_EVENT } from "@/lib/player-reminder-events";

/**
 * Whether the current browser has a logged-in player (portal auth).
 * Anonymous poll visitors are false — they only receive reminders, not game events.
 */
export function useSitePlayerRegistration(): boolean {
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/player/reminder-context", { cache: "no-store" });
        const data = (await response.json()) as {
          context?: { isRegistered?: boolean };
        };

        if (!cancelled) {
          setIsRegistered(data.context?.isRegistered === true);
        }
      } catch {
        if (!cancelled) {
          setIsRegistered(false);
        }
      }
    }

    void load();

    const handleRefresh = () => {
      void load();
    };

    window.addEventListener(PLAYER_GAME_REMINDERS_REFRESH_EVENT, handleRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener(PLAYER_GAME_REMINDERS_REFRESH_EVENT, handleRefresh);
    };
  }, []);

  return isRegistered;
}
