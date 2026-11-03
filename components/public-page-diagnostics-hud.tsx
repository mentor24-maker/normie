"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { useClientValue } from "@/lib/use-client-value";
import { PlayerGameReminderDiagnosticsPanel } from "@/components/player-game-reminder-diagnostics-panel";
import type { PlayerGameReminderDiagnostics } from "@/lib/player-game-reminders";
import {
  shouldShowPublicPageDiagnostics,
  truncateDiagnosticId
} from "@/lib/public-page-diagnostics";

type PublicPageDiagnosticsHudProps = {
  diagnostics: PlayerGameReminderDiagnostics;
  isLoading?: boolean;
};

export function PublicPageDiagnosticsHud({ diagnostics, isLoading = false }: PublicPageDiagnosticsHudProps) {
  const pathname = usePathname() ?? "/";
  const isVisible = useClientValue(
    () => shouldShowPublicPageDiagnostics(window.location.host, pathname),
    false
  );
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isVisible) {
    return null;
  }

  const matchedReminders = diagnostics.reminders.filter((reminder) => reminder.matched);
  const queuedReminders = diagnostics.reminders.filter((reminder) => reminder.queuedForDisplay);

  return (
    <aside
      aria-label="Public page diagnostics"
      className={`public-page-diagnostics-hud${isExpanded ? " is-expanded" : ""}`}
    >
      <div className="public-page-diagnostics-hud-header">
        <div>
          <div className="public-page-diagnostics-hud-eyebrow">Local Dev</div>
          <strong className="public-page-diagnostics-hud-title">Diagnostics</strong>
        </div>
        <button
          className="secondary-button public-page-diagnostics-hud-toggle"
          onClick={() => setIsExpanded((current) => !current)}
          type="button"
        >
          {isExpanded ? "Collapse" : "Details"}
        </button>
      </div>

      <dl className="public-page-diagnostics-hud-summary">
        <div>
          <dt>Polls Taken</dt>
          <dd>{isLoading ? "…" : diagnostics.context.pollsTaken}</dd>
        </div>
        <div>
          <dt>Registered</dt>
          <dd>{isLoading ? "…" : diagnostics.context.isRegistered ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>Matched</dt>
          <dd>
            {isLoading
              ? "…"
              : `${diagnostics.matchedSpeechBubbleCount} speech / ${diagnostics.matchedStripCount} strip`}
          </dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{isLoading ? "…" : diagnostics.evaluationSource}</dd>
        </div>
        <div>
          <dt>Session</dt>
          <dd>{isLoading ? "…" : truncateDiagnosticId(diagnostics.sessionId)}</dd>
        </div>
      </dl>

      {!isLoading && queuedReminders.length > 0 ? (
        <p className="public-page-diagnostics-hud-queue">
          Queued: {queuedReminders.map((reminder) => reminder.name).join(", ")}
        </p>
      ) : null}

      {!isLoading && matchedReminders.length > 0 && queuedReminders.length === 0 ? (
        <p className="public-page-diagnostics-hud-queue">Matched but not queued (check dismissals).</p>
      ) : null}

      {diagnostics.loadError ? <p className="public-page-diagnostics-hud-error">{diagnostics.loadError}</p> : null}

      {isExpanded ? (
        <div className="public-page-diagnostics-hud-details">
          <PlayerGameReminderDiagnosticsPanel diagnostics={diagnostics} isLoading={isLoading} />
        </div>
      ) : null}
    </aside>
  );
}
