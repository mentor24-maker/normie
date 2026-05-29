"use client";

import { PlayerGameReminderDiagnosticsPanel } from "@/components/player-game-reminders";
import type { PlayerGameReminderDiagnostics } from "@/lib/player-game-reminders";
import { isReminderDebugEnabled } from "@/lib/player-game-reminder-debug";
import { useEffect, useState } from "react";

export function PlayerGameReminderDiagnosticsGate({
  diagnostics,
  isLoading = false
}: {
  diagnostics: PlayerGameReminderDiagnostics;
  isLoading?: boolean;
}) {
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  useEffect(() => {
    setShowDiagnostics(isReminderDebugEnabled());
  }, []);

  if (!showDiagnostics) {
    return null;
  }

  return <PlayerGameReminderDiagnosticsPanel diagnostics={diagnostics} isLoading={isLoading} />;
}
