"use client";

import { FormEvent, useState } from "react";
import { AdminImportDiagnostics } from "@/components/admin-import-diagnostics";
import { AdminPollUploadFileInput } from "@/components/admin-poll-upload-file-input";
import { parseAdminJsonResponse } from "@/lib/admin-fetch";
import type { PersonalityImportDiagnostics } from "@/lib/personality-poll-csv-import";

type PersonalityCsvImportFormProps = {
  endpoint: string;
  onImported?: () => Promise<void> | void;
};

type ImportResponse = {
  createdCount?: number;
  error?: string;
  diagnostics?: PersonalityImportDiagnostics & { createdCount?: number };
};

function formatDiagnostics(diagnostics: PersonalityImportDiagnostics | undefined) {
  if (!diagnostics) {
    return "";
  }

  return JSON.stringify(diagnostics, null, 2);
}

export function PersonalityCsvImportForm({ endpoint, onImported }: PersonalityCsvImportFormProps) {
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

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData
      });

      const data = await parseAdminJsonResponse<ImportResponse>(response, "Import failed.");

      if (!response.ok) {
        if (data.diagnostics) {
          setDiagnostics(formatDiagnostics(data.diagnostics));
        }

        throw new Error(data.error ?? "Import failed.");
      }

      setDiagnostics(null);
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
    <form className="admin-poll-upload-form personality-import-form" onSubmit={handleSubmit}>
      <AdminPollUploadFileInput file={file} onFileChange={setFile} />
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
        <AdminImportDiagnostics diagnostics={diagnostics} onDismiss={() => setDiagnostics(null)} />
      ) : null}
    </form>
  );
}
