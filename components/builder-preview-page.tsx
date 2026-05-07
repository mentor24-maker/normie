"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BuilderTemplatePreview } from "@/components/builder-template-preview";
import {
  BUILDER_PREVIEW_STORAGE_KEY,
  createDefaultBackgroundSettings,
  normalizeBuilderDocument
} from "@/lib/builder-template";

type PreviewDraft = {
  name: string;
  pageBackground: ReturnType<typeof createDefaultBackgroundSettings>;
  layoutSections: ReturnType<typeof normalizeBuilderDocument>["layoutSections"];
};

export function BuilderPreviewPage() {
  const [draft, setDraft] = useState<PreviewDraft | null>(null);

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem(BUILDER_PREVIEW_STORAGE_KEY);

      if (!rawValue) {
        return;
      }

      const parsed = JSON.parse(rawValue) as {
        name?: unknown;
        pageBackground?: unknown;
        layoutSections?: unknown;
      };
      const document = normalizeBuilderDocument(parsed);
      setDraft({
        name: String(parsed.name ?? "").trim(),
        pageBackground: document.pageBackground,
        layoutSections: document.layoutSections
      });
    } catch {
      setDraft({
        name: "",
        pageBackground: createDefaultBackgroundSettings(),
        layoutSections: []
      });
    }
  }, []);

  return (
    <main className="admin-page">
      <section className="admin-shell admin-shell-wide">
        <div className="admin-header">
          <div className="admin-brand-copy">
            <div className="page-eyebrow">Builder Preview</div>
            <h1 className="admin-title">{draft?.name || "Unsaved Template Preview"}</h1>
            <p className="page-copy admin-copy">
              This is the fully rendered page preview for the current Builder draft.
            </p>
          </div>
          <div className="admin-actions">
            <Link className="secondary-button" href="/admin/builder">
              Back to Builder
            </Link>
          </div>
        </div>

        {draft && draft.layoutSections.length > 0 ? (
          <BuilderTemplatePreview
            layoutSections={draft.layoutSections}
            pageBackground={draft.pageBackground}
            showShell={false}
          />
        ) : (
          <section className="admin-section">
            <div className="panel-label">Preview</div>
            <h2>No preview content found</h2>
            <p className="page-copy admin-copy">
              Open this page from the Builder using the `Preview` button so the current draft can be loaded here.
            </p>
          </section>
        )}
      </section>
    </main>
  );
}
