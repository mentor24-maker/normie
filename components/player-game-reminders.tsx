"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { formatRichTextContent } from "@/lib/builder-template";
import type { PlayerMatchedReminder } from "@/lib/game-reminder-eval";
import type { PlayerGameReminderDiagnostics } from "@/lib/player-game-reminders";
import {
  clearDismissedReminderIds,
  persistDismissedReminderIds,
  readDismissedReminderIds
} from "@/lib/player-game-reminder-dismissals";

type PlayerGameRemindersProps = {
  popupReminders: PlayerMatchedReminder[];
  inlineReminders: PlayerMatchedReminder[];
};

function ReminderMessage({ messageHtml }: { messageHtml: string }) {
  return (
    <div
      className="player-game-reminder-message"
      dangerouslySetInnerHTML={{ __html: formatRichTextContent(messageHtml) }}
    />
  );
}

export function PlayerGameRemindersInline({ reminders }: { reminders: PlayerMatchedReminder[] }) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    setDismissedIds(readDismissedReminderIds());
  }, []);

  const visibleReminders = useMemo(
    () => reminders.filter((reminder) => !dismissedIds.includes(reminder.id)),
    [dismissedIds, reminders]
  );

  function dismissReminder(reminderId: string) {
    setDismissedIds((current) => {
      const next = current.includes(reminderId) ? current : [...current, reminderId];
      persistDismissedReminderIds(next);
      return next;
    });
  }

  if (visibleReminders.length === 0) {
    return null;
  }

  return (
    <div className="player-game-reminder-inline-stack">
      {visibleReminders.map((reminder) => (
        <article className="notice player-game-reminder-inline" key={reminder.id}>
          <div className="player-game-reminder-inline-body">
            <ReminderMessage messageHtml={reminder.messageHtml} />
          </div>
          <button
            aria-label={`Dismiss ${reminder.name}`}
            className="player-game-reminder-dismiss"
            onClick={() => dismissReminder(reminder.id)}
            type="button"
          >
            ×
          </button>
        </article>
      ))}
    </div>
  );
}

export function PlayerGameRemindersPopup({ reminders }: { reminders: PlayerMatchedReminder[] }) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setDismissedIds(readDismissedReminderIds());
  }, []);

  const visibleReminders = useMemo(
    () => reminders.filter((reminder) => !dismissedIds.includes(reminder.id)),
    [dismissedIds, reminders]
  );
  const activeReminder = visibleReminders[0] ?? null;

  function dismissReminder(reminderId: string) {
    setDismissedIds((current) => {
      const next = current.includes(reminderId) ? current : [...current, reminderId];
      persistDismissedReminderIds(next);
      return next;
    });
  }

  if (!activeReminder || !isMounted) {
    return null;
  }

  return createPortal(
    <div className="player-game-reminder-overlay" role="presentation">
      <div
        aria-labelledby={`player-game-reminder-title-${activeReminder.id}`}
        aria-modal="true"
        className="player-game-reminder-modal"
        role="dialog"
      >
        <div className="player-game-reminder-modal-header">
          <h2 className="player-game-reminder-modal-title" id={`player-game-reminder-title-${activeReminder.id}`}>
            {activeReminder.name}
          </h2>
          <button
            aria-label={`Dismiss ${activeReminder.name}`}
            className="player-game-reminder-dismiss"
            onClick={() => dismissReminder(activeReminder.id)}
            type="button"
          >
            ×
          </button>
        </div>
        <div
          className="player-game-reminder-modal-body"
          onClick={(event) => {
            const link = event.target instanceof Element ? event.target.closest("a") : null;

            if (link) {
              dismissReminder(activeReminder.id);
            }
          }}
        >
          <ReminderMessage messageHtml={activeReminder.messageHtml} />
        </div>
      </div>
    </div>,
    document.body
  );
}

export function PlayerGameReminders({ popupReminders, inlineReminders }: PlayerGameRemindersProps) {
  return (
    <>
      <PlayerGameRemindersInline reminders={inlineReminders} />
      <PlayerGameRemindersPopup reminders={popupReminders} />
    </>
  );
}

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
          : `Server evaluation snapshot from ${new Date(diagnostics.loadedAt).toLocaleString()}.`}
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
          <dt>Active Reminders</dt>
          <dd>{diagnostics.activeReminderCount}</dd>
        </div>
        <div>
          <dt>Matched Popup / Inline</dt>
          <dd>
            {diagnostics.matchedPopupCount} / {diagnostics.matchedInlineCount}
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
              <th>Display</th>
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
                  <td>{reminder.displayType}</td>
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
                  No active reminders loaded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
