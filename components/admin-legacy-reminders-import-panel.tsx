"use client";

import { useCallback, useEffect, useState } from "react";
import type { BuilderPageRecord } from "@/lib/builder-template";
import { readAdminJson } from "@/lib/admin-fetch";

type LegacyReminderImportStatus = {
  slug: string;
  legacyCount: number;
  builderRecordCount: number;
  page: {
    id: string;
    name: string;
    slug: string;
    isPublished: boolean;
  } | null;
};

type LegacyReminderImportResponse = LegacyReminderImportStatus & {
  ok?: boolean;
  importedCount?: number;
  skippedCount?: number;
  totalBuilderRecords?: number;
  createdReminderModule?: boolean;
  page?: BuilderPageRecord;
  error?: string;
};

type AdminLegacyRemindersImportPanelProps = {
  pageSlug: string;
  selectedPageId: string;
  onPageImported: (page: BuilderPageRecord) => void;
};

export function AdminLegacyRemindersImportPanel({
  pageSlug,
  selectedPageId,
  onPageImported
}: AdminLegacyRemindersImportPanelProps) {
  const [status, setStatus] = useState<LegacyReminderImportStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  const normalizedSlug = pageSlug.trim() || "home";
  const [prevSlug, setPrevSlug] = useState(normalizedSlug);

  // Show the loading state again when the target page changes
  // (adjust-during-render; the effect below re-fetches).
  if (prevSlug !== normalizedSlug) {
    setPrevSlug(normalizedSlug);
    setIsLoading(true);
    setError(null);
  }

  // Fetch worker with no synchronous setState; event handlers use
  // refreshStatus so they still flip the loading state.
  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/game/reminders/import-to-builder?slug=${encodeURIComponent(normalizedSlug)}`,
        { cache: "no-store" }
      );
      const data = await readAdminJson<LegacyReminderImportStatus & { error?: string }>(
        response,
        "Failed to load reminder import status."
      );

      setStatus(data);
    } catch (loadError) {
      setStatus(null);
      setError(loadError instanceof Error ? loadError.message : "Failed to load reminder import status.");
    } finally {
      setIsLoading(false);
    }
  }, [normalizedSlug]);

  const refreshStatus = useCallback(() => {
    setIsLoading(true);
    setError(null);
    return loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function importLegacyReminders() {
    setIsImporting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/game/reminders/import-to-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: normalizedSlug })
      });
      const data = await readAdminJson<LegacyReminderImportResponse>(
        response,
        "Failed to import legacy reminders."
      );

      if (data.page) {
        onPageImported(data.page);
      }

      setMessage(
        `Imported ${data.importedCount ?? 0} reminder${data.importedCount === 1 ? "" : "s"} from the database` +
          `${data.skippedCount ? ` (${data.skippedCount} already on the page)` : ""}.` +
          `${data.createdReminderModule ? " Added a Reminders module to this page." : ""}` +
          ` Open the Reminders module below and use Add Reminder for new ones, then Save Page.`
      );

      await refreshStatus();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Failed to import legacy reminders.");
    } finally {
      setIsImporting(false);
    }
  }

  if (normalizedSlug !== "home") {
    return null;
  }

  return (
    <section aria-label="Legacy reminders import" className="panel admin-legacy-reminders-import-panel">
      <h3 className="admin-legacy-reminders-import-title">Reminders On This Page</h3>
      <p className="panel-copy admin-legacy-reminders-import-copy">
        Public reminders live in the <strong>Reminders</strong> module on the home page (not Admin → Game). Expand that
        module in the workspace below — the <strong>Add Reminder</strong> button is at the bottom of its settings. If you
        created reminders in Admin → Game before the refactor, they may still be in the database and can be copied here.
      </p>

      {isLoading ? <p className="panel-copy">Checking reminder storage…</p> : null}
      {error ? <div className="notice error">{error}</div> : null}
      {message ? <div className="notice success">{message}</div> : null}

      {status ? (
        <dl className="admin-legacy-reminders-import-stats">
          <div>
            <dt>Legacy database rows</dt>
            <dd>{status.legacyCount}</dd>
          </div>
          <div>
            <dt>Reminders on home page layout</dt>
            <dd>{status.builderRecordCount}</dd>
          </div>
          <div>
            <dt>Page</dt>
            <dd>{status.page ? `${status.page.name} (${status.page.slug})` : "No home page yet"}</dd>
          </div>
        </dl>
      ) : null}

      <div className="admin-legacy-reminders-import-actions">
        <button
          className="secondary-button"
          disabled={isLoading || isImporting || !status?.legacyCount}
          onClick={() => void importLegacyReminders()}
          type="button"
        >
          {isImporting ? "Importing…" : "Import Legacy Reminders"}
        </button>
        <button className="secondary-button" disabled={isLoading || isImporting} onClick={() => void refreshStatus()} type="button">
          Refresh Counts
        </button>
      </div>

      {selectedPageId && status?.page?.id !== selectedPageId ? (
        <p className="panel-copy admin-legacy-reminders-import-hint">
          Select the <strong>home</strong> page in the list so the builder reloads imported reminders.
        </p>
      ) : null}
    </section>
  );
}
