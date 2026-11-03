"use client";

import { useRef, useState, type DragEvent } from "react";
import { createPortal } from "react-dom";
import { BuilderSettingRow } from "@/components/builder/builder-setting-row";
import { readAdminJson } from "@/lib/admin-fetch";
import type { AdminMediaItem } from "@/lib/admin-media-shared";
import {
  DEFAULT_GALLERY_MEDIA_ASPECT,
  GALLERY_MEDIA_ASPECTS,
  galleryMediaAspectFromDimensions,
  galleryMediaAspectLabel,
  type GalleryMediaAspect
} from "@/lib/gallery-media-aspect";
import { GALLERY_MEDIA_TYPES } from "@/lib/gallery-media-type";
import { useIsHydrated } from "@/lib/use-client-value";

type BuilderGalleryUploadModalProps = {
  categoryOptions: string[];
  onClose: () => void;
  /** Fires once the file is in the gallery — the picker then inserts it where it was opened. */
  onUploaded: (media: AdminMediaItem) => void;
};

const CATEGORY_LIST_ID = "builder-gallery-upload-categories";

export function BuilderGalleryUploadModal({
  categoryOptions,
  onClose,
  onUploaded
}: BuilderGalleryUploadModalProps) {
  const mounted = useIsHydrated();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaCategory, setMediaCategory] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [aspect, setAspect] = useState<GalleryMediaAspect>(DEFAULT_GALLERY_MEDIA_ASPECT);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function chooseFile(next: File | null) {
    if (!next) {
      return;
    }

    if (!next.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }

    setError(null);
    setFile(next);
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return URL.createObjectURL(next);
    });
  }

  function clearPreview() {
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return null;
    });
  }

  function handleClose() {
    clearPreview();
    onClose();
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function handleUpload() {
    if (!file || isUploading) {
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("media_category", mediaCategory.trim());
      formData.append("media_type", mediaType);
      formData.append("aspect", aspect);

      const response = await fetch("/api/admin/media", {
        method: "POST",
        body: formData
      });

      const data = await readAdminJson<{ error?: string; media?: AdminMediaItem }>(
        response,
        "Failed to upload media."
      );

      if (!response.ok || !data.media) {
        throw new Error(data.error ?? "Failed to upload media.");
      }

      clearPreview();
      onUploaded(data.media);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload media.");
    } finally {
      setIsUploading(false);
    }
  }

  if (!mounted) {
    return null;
  }

  return createPortal(
    // This portal still sits inside the picker's React tree, so clicks would
    // bubble to the picker overlay and close it too — stop them here.
    <div
      className="builder-gallery-upload-overlay"
      onClick={(event) => {
        event.stopPropagation();
        handleClose();
      }}
      role="presentation"
    >
      <div
        aria-label="Upload image to gallery"
        aria-modal="true"
        className="builder-gallery-upload-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="builder-gallery-upload-header">
          <div>
            <div className="panel-label">Media Gallery</div>
            <h3>Upload Image</h3>
            <p className="page-copy admin-copy builder-gallery-upload-summary">
              The image is added to the gallery and placed where you opened the picker.
            </p>
          </div>
          <button className="secondary-button" onClick={handleClose} type="button">
            Close
          </button>
        </div>

        <div
          className={`builder-gallery-upload-dropzone${isDragging ? " is-dragging" : ""}${previewUrl ? " has-file" : ""}`}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDrop={handleDrop}
        >
          {previewUrl && file ? (
            <>
              <span className="builder-gallery-upload-preview">
                {/* Blob preview of a not-yet-uploaded file — next/image cannot serve object URLs. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={file.name}
                  onLoad={(event) => {
                    const image = event.currentTarget;
                    setAspect(galleryMediaAspectFromDimensions(image.naturalWidth, image.naturalHeight));
                  }}
                  src={previewUrl}
                />
              </span>
              <div className="builder-gallery-upload-file-meta">
                <strong>{file.name}</strong>
                <span>{Math.max(1, Math.round(file.size / 1024)).toLocaleString()} KB</span>
              </div>
            </>
          ) : (
            <p className="builder-gallery-upload-dropzone-copy">
              Drag an image here, or choose a file to upload.
            </p>
          )}
          <button
            className="secondary-button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            {file ? "Choose a Different File" : "Choose File"}
          </button>
          <input
            accept="image/*"
            className="builder-gallery-upload-input"
            onChange={(event) => {
              chooseFile(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
            ref={fileInputRef}
            type="file"
          />
        </div>

        <div className="builder-gallery-upload-fields">
          <BuilderSettingRow fullWidth label="Category">
            <input
              list={CATEGORY_LIST_ID}
              onChange={(event) => setMediaCategory(event.target.value)}
              placeholder="Optional"
              type="text"
              value={mediaCategory}
            />
            <datalist id={CATEGORY_LIST_ID}>
              {categoryOptions.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </BuilderSettingRow>
          <BuilderSettingRow fullWidth label="Type">
            <select onChange={(event) => setMediaType(event.target.value)} value={mediaType}>
              <option value="">—</option>
              {GALLERY_MEDIA_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </BuilderSettingRow>
          <BuilderSettingRow fullWidth label="Aspect">
            <select
              onChange={(event) => setAspect(event.target.value as GalleryMediaAspect)}
              value={aspect}
            >
              {GALLERY_MEDIA_ASPECTS.map((option) => (
                <option key={option} value={option}>
                  {galleryMediaAspectLabel(option)}
                </option>
              ))}
            </select>
          </BuilderSettingRow>
        </div>

        {error ? <div className="notice error admin-notice">{error}</div> : null}

        <div className="builder-gallery-upload-actions">
          <button className="secondary-button" disabled={isUploading} onClick={handleClose} type="button">
            Cancel
          </button>
          <button
            className="submit-button admin-blog-add-button"
            disabled={!file || isUploading}
            onClick={() => void handleUpload()}
            type="button"
          >
            {isUploading ? "Uploading..." : "Upload Image"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
