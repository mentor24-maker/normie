"use client";

import Image from "next/image";
import { GalleryMediaFilterBar } from "@/components/gallery-media-filter-bar";
import { getGalleryMediaThumbnailUrl } from "@/lib/gallery-media-thumbnail";
import { useGalleryMediaLibrary } from "@/lib/use-gallery-media-library";

type BuilderGalleryModalProps = {
  isUploading: boolean;
  onSelectImage: (imagePath: string) => void;
  onClose: () => void;
  onUploadImage?: (file: File | null) => void | Promise<void>;
};

export function BuilderGalleryModal({
  isUploading,
  onSelectImage,
  onClose,
  onUploadImage
}: BuilderGalleryModalProps) {
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
    canLoadMore
  } = useGalleryMediaLibrary({ syncOnFirstLoad: false });

  async function handleUpload(file: File | null) {
    if (!file || !onUploadImage) {
      return;
    }

    await onUploadImage(file);
    await loadMedia();
  }

  return (
    <div className="builder-gallery-overlay" onClick={onClose} role="presentation">
      <div
        className="builder-gallery-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Media gallery"
      >
        <div className="builder-gallery-header">
          <div>
            <div className="panel-label">Media Gallery</div>
            <h3>Choose From Gallery</h3>
            <p className="page-copy admin-copy builder-gallery-modal-summary">
              {isLoading && media.length === 0
                ? "Loading media..."
                : total === 0
                  ? "No files match the current filters."
                  : `Showing ${rangeStart}–${rangeEnd} of ${total} file${total === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="builder-gallery-header-actions">
            {onUploadImage ? (
              <label className="secondary-button builder-gallery-button builder-upload-button">
                <span>{isUploading ? "Uploading..." : "Add to Gallery"}</span>
                <input
                  accept="image/*,video/*"
                  className="builder-upload-input"
                  disabled={isUploading}
                  multiple
                  type="file"
                  onChange={(event) => {
                    const files = event.target.files;

                    if (!files || files.length === 0) {
                      return;
                    }

                    void (async () => {
                      for (const file of Array.from(files)) {
                        await handleUpload(file);
                      }
                      event.currentTarget.value = "";
                    })();
                  }}
                />
              </label>
            ) : null}
            <button className="secondary-button" onClick={onClose} type="button">
              Close
            </button>
          </div>
        </div>
        <div className="builder-gallery-body">
          <GalleryMediaFilterBar filters={filters} onChange={setFilters} onClear={clearFilters} />
          <div className="builder-gallery-grid">
            {media.map((image) => (
              <button
                className="builder-gallery-card"
                key={image.path}
                onClick={() => onSelectImage(image.path)}
                type="button"
              >
                <div className="builder-gallery-thumb">
                  {image.kind === "image" ? (
                    <Image
                      alt={image.name}
                      fill
                      sizes="180px"
                      src={getGalleryMediaThumbnailUrl(image.path)}
                    />
                  ) : (
                    <video className="builder-gallery-video" controls preload="metadata" src={image.path} />
                  )}
                </div>
                <span>{image.name}</span>
                <small className="gallery-meta">
                  {image.directory} · {image.kind}
                </small>
              </button>
            ))}
            {!isLoading && media.length === 0 ? (
              <div className="builder-gallery-empty">
                {isUploading ? "Uploading..." : "No media found in the gallery."}
              </div>
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
        </div>
      </div>
    </div>
  );
}
