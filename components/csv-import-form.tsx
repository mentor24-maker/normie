"use client";

import { FormEvent, useState } from "react";

type CsvImportFormProps = {
  onImported?: () => Promise<void> | void;
  importType?: "standard" | "advanced";
  helpColumns?: string;
  submitLabel?: string;
};

export function CsvImportForm({
  onImported,
  importType = "standard",
  helpColumns = "ID,Category,Question,Option_A,Option_B",
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
    <form className="import-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>CSV file</span>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          required
        />
      </label>

      <div className="csv-help">
        Example columns: <code>{helpColumns}</code>
      </div>

      <button className="submit-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Importing..." : submitLabel}
      </button>

      {message ? <div className="notice success">{message}</div> : null}
      {error ? <div className="notice error">{error}</div> : null}
    </form>
  );
}
