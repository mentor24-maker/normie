"use client";

import { FormEvent, useState } from "react";
import { BuilderSettingRow } from "@/components/builder/builder-setting-row";
import { parseAdminJsonResponse } from "@/lib/admin-fetch";
import type { StarcasterImportDiagnostics } from "@/lib/starcaster-poll-csv-import";
import { STARCASTER_CSV_HELP_COLUMNS } from "@/lib/starcaster-poll-import";

type StarcasterCsvImportFormProps = {
  onImported?: () => Promise<void> | void;
};

type ImportResponse = {
  createdCount?: number;
  error?: string;
  diagnostics?: StarcasterImportDiagnostics & { createdCount?: number };
};

function formatDiagnostics(diagnostics: StarcasterImportDiagnostics | undefined) {
  if (!diagnostics) {
    return "";
  }

  return JSON.stringify(diagnostics, null, 2);
}

export function StarcasterCsvImportForm({ onImported }: StarcasterCsvImportFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Choose a CSV file first.");
      setDiagnostics(null);
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setError(null);
    setDiagnostics(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/polls/import-starcaster", {
        method: "POST",
        body: formData
      });

      const data = await parseAdminJsonResponse<ImportResponse>(response, "Starcaster import failed.");

      if (data.diagnostics) {
        setDiagnostics(formatDiagnostics(data.diagnostics));
      }

      if (!response.ok) {
        throw new Error(data.error ?? "Starcaster import failed.");
      }

      setMessage(`Imported ${data.createdCount ?? 0} poll row${data.createdCount === 1 ? "" : "s"}.`);
      setFile(null);
      await onImported?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Starcaster import failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="import-form starcaster-import-form" onSubmit={handleSubmit}>
      <BuilderSettingRow label="CSV File">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          required
        />
      </BuilderSettingRow>

      <div className="csv-help starcaster-import-help">
        Required columns: <code>{STARCASTER_CSV_HELP_COLUMNS}</code>
      </div>

      <button
        className="submit-button admin-blog-add-button"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Importing..." : "Upload Starcaster CSV"}
      </button>

      {message ? <div className="notice success admin-notice">{message}</div> : null}
      {error ? <div className="notice error admin-notice">{error}</div> : null}
      {diagnostics ? (
        <details className="starcaster-import-diagnostics">
          <summary>Import Diagnostics</summary>
          <pre>{diagnostics}</pre>
        </details>
      ) : null}
    </form>
  );
}
