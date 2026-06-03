"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { GalleryMediaMetadataControls } from "@/components/gallery-media-metadata-controls";
import type { AdminMediaItem } from "@/lib/admin-media-shared";
import {
  normalizeGalleryMediaAspect,
  type GalleryMediaAspect
} from "@/lib/gallery-media-aspect";
import { formatGalleryDisplayFileName } from "@/lib/gallery-display-filename";
import { getGalleryMediaThumbnailUrl } from "@/lib/gallery-media-thumbnail";

type GalleryMediaDetailModalProps = {
  item: AdminMediaItem;
  categoryOptions: string[];
  onClose: () => void;
  onPatch: (
    patch: {
      media_category?: string;
      media_type?: string;
      aspect?: GalleryMediaAspect;
    },
    successMessage?: string
  ) => Promise<void>;
  onError: (message: string) => void;
};

function formatMediaTimestamp(value: string | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}

export function GalleryMediaDetailModal({
  item,
  categoryOptions,
  onClose,
  onPatch,
  onError
}: GalleryMediaDetailModalProps) {
  const [mediaCategory, setMediaCategory] = useState(item.mediaCategory ?? "");
  const [mediaType, setMediaType] = useState(item.mediaType ?? "");
  const [aspect, setAspect] = useState<GalleryMediaAspect>(normalizeGalleryMediaAspect(item.aspect));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMediaCategory(item.mediaCategory ?? "");
    setMediaType(item.mediaType ?? "");
    setAspect(normalizeGalleryMediaAspect(item.aspect));
  }, [item.aspect, item.mediaCategory, item.mediaType, item.path]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  async function applyPatch(
    patch: {
      media_category?: string;
      media_type?: string;
      aspect?: GalleryMediaAspect;
    },
    successMessage?: string
  ) {
    setIsSaving(true);

    try {
      await onPatch(patch, successMessage);
    } catch (saveError) {
      onError(saveError instanceof Error ? saveError.message : "Failed to update gallery media.");
    } finally {
      setIsSaving(false);
    }
  }

  const previewSrc =
    item.kind === "image" ? getGalleryMediaThumbnailUrl(item.path, 480) : item.path;
  const displayName = formatGalleryDisplayFileName(item.name);

  return (
    <div className="admin-gallery-detail-overlay" onClick={onClose} role="presentation">
      <div
        className="admin-gallery-detail-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="gallery-media-detail-title"
        aria-modal="true"
      >
        <div className="admin-gallery-detail-header">
          <h3 id="gallery-media-detail-title">{displayName}</h3>
          <button className="secondary-button" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="admin-gallery-detail-body">
          <div className="admin-gallery-detail-preview">
            {item.kind === "image" ? (
              <Image alt={item.name} fill sizes="320px" src={previewSrc} />
            ) : (
              <video controls preload="metadata" src={item.path} />
            )}
          </div>
          <div className="admin-gallery-detail-fields">
            <GalleryMediaMetadataControls
              aspect={aspect}
              categoryOptions={categoryOptions}
              disabled={isSaving}
              mediaCategory={mediaCategory}
              mediaType={mediaType}
              onAspectChange={(value) => {
                setAspect(value);
                void applyPatch({ aspect: value }, "Updated aspect.");
              }}
              onCategoryChange={(value) => {
                setMediaCategory(value);
                void applyPatch({ media_category: value }, "Updated media category.");
              }}
              onTypeChange={(value) => {
                setMediaType(value);
                void applyPatch({ media_type: value }, "Updated media type.");
              }}
            />
          </div>
          <div className="admin-gallery-detail-meta">
            <div className="admin-gallery-detail-field">
              <span className="admin-gallery-detail-label">Storage Name</span>
              <span className="admin-gallery-detail-value">{item.storageName ?? item.name}</span>
            </div>
            <div className="admin-gallery-detail-field">
              <span className="admin-gallery-detail-label">Directory</span>
              <span className="admin-gallery-detail-value">{item.directory}</span>
            </div>
            <div className="admin-gallery-detail-field">
              <span className="admin-gallery-detail-label">File Kind</span>
              <span className="admin-gallery-detail-value">{item.kind === "image" ? "Image" : "Video"}</span>
            </div>
            <div className="admin-gallery-detail-field">
              <span className="admin-gallery-detail-label">Format</span>
              <span className="admin-gallery-detail-value">{item.extension}</span>
            </div>
            <div className="admin-gallery-detail-field">
              <span className="admin-gallery-detail-label">Uploaded</span>
              <span className="admin-gallery-detail-value">{formatMediaTimestamp(item.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
