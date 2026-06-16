"use client";

import { useState } from "react";

export function AdminPollResponsePurgePanel() {
  const [isPurging, setIsPurging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePurge() {
    const confirmed = window.confirm(
      "Remove all saved answers and reactions that no longer belong to a live published poll? Player dashboard and leaderboard totals will reset to match. This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setIsPurging(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/responses/purge-orphaned", { method: "POST" });
      const data = (await response.json()) as {
        deletedCount?: number;
        deletedResponseCount?: number;
        deletedReactionCount?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to purge stale poll responses.");
      }

      setMessage(
        `Removed ${data.deletedResponseCount ?? 0} stale answer row(s) and ${data.deletedReactionCount ?? 0} stale reaction row(s).`
      );
    } catch (purgeError) {
      setError(
        purgeError instanceof Error ? purgeError.message : "Failed to purge stale poll responses."
      );
    } finally {
      setIsPurging(false);
    }
  }

  return (
    <section className="admin-section admin-polls-purge-panel">
      <div className="panel-label">Player Data Cleanup</div>
      <h2>Stale Poll Responses</h2>
      <p className="page-copy admin-copy">
        After deleting, hiding, or unpublishing polls, old answer and reaction rows can remain in the database and
        inflate player totals. This removes every player record that does not point at a currently published poll.
      </p>

      {error ? <div className="notice error admin-notice">{error}</div> : null}
      {message ? <div className="notice success admin-notice">{message}</div> : null}

      <button
        className="secondary-button"
        disabled={isPurging}
        onClick={() => void handlePurge()}
        type="button"
      >
        {isPurging ? "Purging..." : "Purge Stale Responses"}
      </button>
    </section>
  );
}
