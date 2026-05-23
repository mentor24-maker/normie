"use client";

import { useState } from "react";

type AdminImportDiagnosticsProps = {
  diagnostics: string;
  onDismiss: () => void;
};

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"
      />
    </svg>
  );
}

export function AdminImportDiagnostics({ diagnostics, onDismiss }: AdminImportDiagnosticsProps) {
  const [copied, setCopied] = useState(false);

  async function copyDiagnostics() {
    try {
      await navigator.clipboard.writeText(diagnostics);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="personality-import-diagnostics admin-poll-upload-feedback">
      <div className="personality-import-diagnostics-toolbar">
        <span className="personality-import-diagnostics-label">Import Diagnostics</span>
        <div className="personality-import-diagnostics-actions">
          <button
            className="polls-icon-button admin-import-diagnostics-icon-button"
            onClick={() => void copyDiagnostics()}
            type="button"
            aria-label={copied ? "Copied diagnostics" : "Copy diagnostics"}
            title={copied ? "Copied" : "Copy"}
          >
            <CopyIcon />
          </button>
          <button
            className="polls-icon-button admin-import-diagnostics-icon-button"
            onClick={onDismiss}
            type="button"
            aria-label="Close diagnostics"
            title="Close"
          >
            <CloseIcon />
          </button>
        </div>
      </div>
      <pre>{diagnostics}</pre>
    </div>
  );
}
