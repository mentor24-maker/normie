"use client";

import { PlayerGameReminderDiagnosticsPanel } from "@/components/player-game-reminder-diagnostics-panel";
import type { PlayerGameReminderDiagnostics } from "@/lib/player-game-reminders";
import { isReminderDebugEnabled } from "@/lib/player-game-reminder-debug";
import { useClientValue } from "@/lib/use-client-value";

export function PlayerGameReminderDiagnosticsGate({
  diagnostics,
  isLoading = false
}: {
  diagnostics: PlayerGameReminderDiagnostics;
  isLoading?: boolean;
}) {
  const showDiagnostics = useClientValue(isReminderDebugEnabled, false);

  if (!showDiagnostics) {
    return null;
  }

  return <PlayerGameReminderDiagnosticsPanel diagnostics={diagnostics} isLoading={isLoading} />;
}
