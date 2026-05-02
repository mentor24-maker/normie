"use client";

import { FormEvent, useState } from "react";

export function CsvImportForm() {
  const [adminKey, setAdminKey] = useState("");
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

      const response = await fetch("/api/import", {
        method: "POST",
        headers: {
          "x-import-admin-key": adminKey
        },
        body: formData
      });

      const data = (await response.json()) as { createdCount?: number; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Import failed.");
      }

      setMessage(`Imported ${data.createdCount ?? 0} poll rows.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Import failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="import-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Import admin key</span>
        <input
          type="password"
          value={adminKey}
          onChange={(event) => setAdminKey(event.target.value)}
          placeholder="Matches IMPORT_ADMIN_KEY"
          required
        />
      </label>

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
        Example columns: <code>question,option_1,option_2,option_3</code>
      </div>

      <button className="submit-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Importing..." : "Upload CSV"}
      </button>

      {message ? <div className="notice success">{message}</div> : null}
      {error ? <div className="notice error">{error}</div> : null}
    </form>
  );
}
