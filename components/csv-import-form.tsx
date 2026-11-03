"use client";

import { FormEvent, useState } from "react";
import { AdminPollUploadFileInput } from "@/components/admin-poll-upload-file-input";

type CsvImportFormProps = {
  onImported?: () => Promise<void> | void;
  importType?: "standard" | "advanced";
  submitLabel?: string;
};

export function CsvImportForm({
  onImported,
  importType = "standard",
  submitLabel = "Upload CSV"
}: CsvImportFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("import_type", importType);

      const response = await fetch("/api/import", {
        method: "POST",
        body: formData
      });

      const data = (await response.json()) as { createdCount?: number; error?: string };

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
    <form className="admin-poll-upload-form" onSubmit={handleSubmit}>
      <AdminPollUploadFileInput file={file} onFileChange={setFile} />
      <button
        className="submit-button admin-blog-add-button admin-poll-upload-submit"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Importing..." : submitLabel}
      </button>

      {message ? <div className="notice success admin-notice admin-poll-upload-feedback">{message}</div> : null}
      {error ? <div className="notice error admin-notice admin-poll-upload-feedback">{error}</div> : null}
    </form>
  );
}
