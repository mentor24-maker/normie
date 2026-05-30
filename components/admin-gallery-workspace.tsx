"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { AdminMediaItem } from "@/lib/admin-media";

export function AdminGalleryWorkspace() {
  const [media, setMedia] = useState<AdminMediaItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [savingBadgeFor, setSavingBadgeFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function loadMedia() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/media", {
        cache: "no-store"
      });

      const data = (await response.json()) as { media?: AdminMediaItem[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load media library.");
      }

      setMedia(data.media ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load media library.");
      setMedia([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadMedia();
  }, []);

  async function handleUpload(file: File | null) {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/media", {
        method: "POST",
        body: formData
      });

      const data = (await response.json()) as { error?: string; media?: AdminMediaItem };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to upload media.");
      }

      setMessage(`Uploaded ${data.media?.name ?? file.name} to the gallery.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await loadMedia();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload media.");
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
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update badge setting.");
      }

      setMedia((current) =>
        current.map((entry) =>
          (entry.storageName ?? entry.name) === storageName ? { ...entry, badge } : entry
        )
      );
      setMessage(badge ? `Marked ${item.name} as a badge symbol.` : `Removed ${item.name} from badge symbols.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update badge setting.");
    } finally {
      setSavingBadgeFor(null);
    }
  }

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
              <span>Supports images and videos.</span>
            </div>
            <input
              ref={fileInputRef}
              className="gallery-file-input"
              type="file"
              accept="image/*,video/*"
              onChange={(event) => void handleUpload(event.target.files?.[0] ?? null)}
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
        {error ? <div className="notice error admin-notice">{error}</div> : null}
      </section>

      <section className="admin-section">
        <div className="admin-toolbar">
          <div>
            <div className="panel-label">Library</div>
            <h2>Available Media</h2>
            <p className="page-copy admin-copy">
              {isLoading
                ? "Loading media..."
                : `${media.length} file${media.length === 1 ? "" : "s"} available`}
            </p>
          </div>
          <div className="admin-actions">
            <button className="secondary-button" onClick={() => void loadMedia()} type="button" disabled={isLoading}>
              Refresh
            </button>
          </div>
        </div>

        <div className="builder-gallery-grid">
          {media.map((item) => {
            const storageName = item.storageName ?? item.name;
            const isSavingBadge = savingBadgeFor === storageName;

            return (
              <article className="builder-gallery-card builder-gallery-card-static" key={item.path}>
                <div className="builder-gallery-thumb">
                  {item.kind === "image" ? (
                    <Image alt={item.name} fill sizes="180px" src={item.path} />
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
          {media.length === 0 ? (
            <div className="builder-gallery-empty">No media found yet.</div>
          ) : null}
        </div>
      </section>
    </section>
  );
}
