"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { GalleryMediaFilterBar } from "@/components/gallery-media-filter-bar";
import { readAdminJson } from "@/lib/admin-fetch";
import type { AdminMediaItem } from "@/lib/admin-media-shared";
import { getGalleryMediaThumbnailUrl } from "@/lib/gallery-media-thumbnail";
import { useGalleryMediaLibrary } from "@/lib/use-gallery-media-library";

export function AdminGalleryWorkspace() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [savingBadgeFor, setSavingBadgeFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    media,
    total,
    isLoading,
    filters,
    setFilters,
    loadMedia,
    clearFilters,
    rangeStart,
    rangeEnd,
    canLoadMore,
    loadError
  } = useGalleryMediaLibrary({ syncOnFirstLoad: true });

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    const fileList = Array.from(files);

    setIsUploading(true);
    setError(null);
    setMessage(null);

    const uploadedNames: string[] = [];
    const failures: string[] = [];

    try {
      for (const file of fileList) {
        try {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/admin/media", {
            method: "POST",
            body: formData
          });

          const data = await readAdminJson<{ error?: string; media?: AdminMediaItem }>(
            response,
            "Failed to upload media."
          );

          if (!response.ok) {
            failures.push(`${file.name}: ${data.error ?? "Failed to upload media."}`);
            continue;
          }

          uploadedNames.push(data.media?.name ?? file.name);
        } catch (uploadError) {
          failures.push(
            `${file.name}: ${uploadError instanceof Error ? uploadError.message : "Failed to upload media."}`
          );
        }
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (uploadedNames.length > 0) {
        await loadMedia();
        setMessage(
          uploadedNames.length === 1
            ? `Uploaded ${uploadedNames[0]} to the gallery.`
            : `Uploaded ${uploadedNames.length} files to the gallery.`
        );
      }

      if (failures.length > 0) {
        const failureSummary = failures.join(" ");
        setError(
          failures.length === fileList.length
            ? failureSummary
            : `${failures.length} of ${fileList.length} uploads failed. ${failureSummary}`
        );
      }
    } finally {
      setIsUploading(false);
    }
  }

  async function updateBadgeFlag(item: AdminMediaItem, badge: boolean) {
    const storageName = item.storageName ?? item.name;

    setSavingBadgeFor(storageName);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storageName, badge })
      });
      const data = await readAdminJson<{ error?: string }>(response, "Failed to update badge setting.");

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update badge setting.");
      }

      setMessage(badge ? `Marked ${item.name} as a badge symbol.` : `Removed ${item.name} from badge symbols.`);
      await loadMedia();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update badge setting.");
    } finally {
      setSavingBadgeFor(null);
    }
  }

  const displayError = error ?? loadError;

  return (
    <section className="admin-stack">
      <section className="admin-section">
        <div className="panel-label">Gallery</div>
        <h2>Gallery Media Library</h2>
        <p className="page-copy admin-copy">
          Files live in the Supabase Storage <code>gallery</code> bucket. Use the Badge Symbol toggle on an image to
          include it in reward badge symbol pickers.
        </p>
        <div className="gallery-controls">
          <div className="gallery-upload-card">
            <div className="gallery-upload-copy">
              <strong>Upload to Gallery</strong>
              <span>Supports images and videos. You can select multiple files at once.</span>
            </div>
            <input
              ref={fileInputRef}
              className="gallery-file-input"
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(event) => void handleUpload(event.target.files)}
            />
            <button
              className="secondary-button"
              onClick={() => fileInputRef.current?.click()}
              type="button"
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Upload Media"}
            </button>
          </div>
        </div>

        {message ? <div className="notice success admin-notice">{message}</div> : null}
        {displayError ? <div className="notice error admin-notice">{displayError}</div> : null}
      </section>

      <section className="admin-section">
        <div className="admin-toolbar">
          <div>
            <div className="panel-label">Library</div>
            <h2>Available Media</h2>
            <p className="page-copy admin-copy">
              {isLoading && media.length === 0
                ? "Loading media..."
                : total === 0
                  ? "No files match the current filters."
                  : `Showing ${rangeStart}–${rangeEnd} of ${total} file${total === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="admin-actions">
            <button
              className="secondary-button"
              onClick={() => void loadMedia({ sync: true })}
              type="button"
              disabled={isLoading}
            >
              Refresh
            </button>
          </div>
        </div>

        <GalleryMediaFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />

        <div className="builder-gallery-grid">
          {media.map((item) => {
            const storageName = item.storageName ?? item.name;
            const isSavingBadge = savingBadgeFor === storageName;

            return (
              <article className="builder-gallery-card builder-gallery-card-static" key={item.path}>
                <div className="builder-gallery-thumb">
                  {item.kind === "image" ? (
                    <Image
                      alt={item.name}
                      fill
                      sizes="180px"
                      src={getGalleryMediaThumbnailUrl(item.path)}
                    />
                  ) : (
                    <video className="builder-gallery-video" controls preload="metadata" src={item.path} />
                  )}
                </div>
                <strong>{item.name}</strong>
                <span className="gallery-meta">
                  {item.directory} · {item.kind}
                </span>
                {item.kind === "image" ? (
                  <label className="admin-gallery-badge-toggle">
                    <input
                      checked={Boolean(item.badge)}
                      disabled={isSavingBadge}
                      onChange={(event) => void updateBadgeFlag(item, event.target.checked)}
                      type="checkbox"
                    />
                    <span>Badge Symbol</span>
                  </label>
                ) : null}
              </article>
            );
          })}
          {!isLoading && media.length === 0 ? (
            <div className="builder-gallery-empty">No media found yet.</div>
          ) : null}
        </div>

        {canLoadMore ? (
          <div className="admin-gallery-load-more">
            <button
              className="secondary-button"
              disabled={isLoading}
              onClick={() => void loadMedia({ append: true })}
              type="button"
            >
              {isLoading ? "Loading..." : "Load More"}
            </button>
          </div>
        ) : null}
      </section>
    </section>
  );
}
