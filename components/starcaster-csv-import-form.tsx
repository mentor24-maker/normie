"use client";

import { FormEvent, useState } from "react";
import { parseAdminJsonResponse } from "@/lib/admin-fetch";
import type { StarcasterImportDiagnostics } from "@/lib/starcaster-poll-csv-import";

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

      const data = await parseAdminJsonResponse<ImportResponse>(response, "Import failed.");

      if (data.diagnostics) {
        setDiagnostics(formatDiagnostics(data.diagnostics));
      }

      if (!response.ok) {
        throw new Error(data.error ?? "Import failed.");
      }

      setMessage(`Imported ${data.createdCount ?? 0} poll row${data.createdCount === 1 ? "" : "s"}.`);
      setFile(null);
      await onImported?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Import failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="admin-poll-upload-form starcaster-import-form" onSubmit={handleSubmit}>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        required
      />
      <button
        className="submit-button admin-blog-add-button admin-poll-upload-submit"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Importing..." : "Upload CSV"}
      </button>

      {message ? <div className="notice success admin-notice admin-poll-upload-feedback">{message}</div> : null}
      {error ? <div className="notice error admin-notice admin-poll-upload-feedback">{error}</div> : null}
      {diagnostics ? (
        <details className="starcaster-import-diagnostics admin-poll-upload-feedback">
          <summary>Import Diagnostics</summary>
          <pre>{diagnostics}</pre>
        </details>
      ) : null}
    </form>
  );
}
