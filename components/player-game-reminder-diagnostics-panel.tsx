"use client";

import { useEffect, useState } from "react";
import type { PlayerGameReminderDiagnostics } from "@/lib/player-game-reminders";
import {
  clearDismissedReminderIds,
  persistDismissedReminderIds,
  readDismissedReminderIds
} from "@/lib/player-game-reminder-dismissals";

export function PlayerGameReminderDiagnosticsPanel({
  diagnostics,
  isLoading = false
}: {
  diagnostics: PlayerGameReminderDiagnostics;
  isLoading?: boolean;
}) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    setDismissedIds(readDismissedReminderIds());
  }, []);

  const reminderRows = diagnostics.reminders.map((reminder) => ({
    ...reminder,
    blockedByDismissal: reminder.queuedForDisplay && dismissedIds.includes(reminder.id)
  }));

  function handleClearDismissals() {
    clearDismissedReminderIds();
    setDismissedIds([]);
  }

  return (
    <section aria-label="Reminder diagnostics" className="panel player-panel player-game-reminder-diagnostics">
      <div className="player-panel-header">
        <div>
          <div className="panel-label">Diagnostics</div>
          <h2>Reminder Diagnostics</h2>
        </div>
        <button className="secondary-button" onClick={handleClearDismissals} type="button">
          Clear Dismissals
        </button>
      </div>
      <p className="panel-copy player-game-reminder-diagnostics-intro">
        {isLoading
          ? "Loading reminder evaluation..."
          : `Evaluation snapshot from ${new Date(diagnostics.loadedAt).toLocaleString()}.`}
      </p>
      {diagnostics.loadError ? <div className="notice error">{diagnostics.loadError}</div> : null}
      <dl className="player-game-reminder-diagnostics-grid">
        <div>
          <dt>Player ID</dt>
          <dd>{diagnostics.playerId ?? "Not signed in"}</dd>
        </div>
        <div>
          <dt>Evaluation Source</dt>
          <dd>{diagnostics.evaluationSource}</dd>
        </div>
        <div>
          <dt>Poll Session ID</dt>
          <dd>{diagnostics.sessionId ?? "None"}</dd>
        </div>
        <div>
          <dt>Polls Taken</dt>
          <dd>{diagnostics.context.pollsTaken}</dd>
        </div>
        <div>
          <dt>Logins</dt>
          <dd>{diagnostics.context.loginCount}</dd>
        </div>
        <div>
          <dt>Registered</dt>
          <dd>{diagnostics.context.isRegistered ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>Page Reminders</dt>
          <dd>{diagnostics.activeReminderCount}</dd>
        </div>
        <div>
          <dt>Matched Speech / Strip</dt>
          <dd>
            {diagnostics.matchedSpeechBubbleCount} / {diagnostics.matchedStripCount}
          </dd>
        </div>
        <div>
          <dt>Dismissed In Browser</dt>
          <dd>{dismissedIds.length ? dismissedIds.join(", ") : "None"}</dd>
        </div>
        <div>
          <dt>Answered Poll IDs</dt>
          <dd>{diagnostics.context.answeredPollIds.length ? diagnostics.context.answeredPollIds.join(", ") : "None"}</dd>
        </div>
      </dl>
      <div className="table-shell player-game-reminder-diagnostics-table-shell">
        <table className="polls-table player-game-reminder-diagnostics-table">
          <thead>
            <tr>
              <th>Reminder</th>
              <th>Appearance</th>
              <th>Criteria</th>
              <th>Matched</th>
              <th>Reason</th>
              <th>Queued</th>
              <th>Dismissed</th>
            </tr>
          </thead>
          <tbody>
            {reminderRows.length ? (
              reminderRows.map((reminder) => (
                <tr key={reminder.id}>
                  <td>{reminder.name}</td>
                  <td>{reminder.appearance}</td>
                  <td>{reminder.criterionSummary}</td>
                  <td>{reminder.matched ? "Yes" : "No"}</td>
                  <td>{reminder.matchReason}</td>
                  <td>{reminder.queuedForDisplay ? "Yes" : "No"}</td>
                  <td>{reminder.blockedByDismissal ? "Yes" : "No"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="empty-cell" colSpan={7}>
                  No reminder modules on this page.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
