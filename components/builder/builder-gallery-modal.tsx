"use client";

import Image from "next/image";
import { useMemo } from "react";
import { createPortal } from "react-dom";
import { useIsHydrated } from "@/lib/use-client-value";
import { GalleryMediaFilterBar } from "@/components/gallery-media-filter-bar";
import { GalleryMediaListTable } from "@/components/gallery-media-list-table";
import { GalleryViewToggle } from "@/components/gallery-view-toggle";
import { getRichTextGalleryModalStyle, type BuilderModalAnchor } from "@/lib/builder-anchored-modal";
import { buildGalleryMediaCategoryOptions } from "@/lib/gallery-media-category";
import { nextGalleryMediaListSort, type GalleryMediaListSortKey } from "@/lib/gallery-media-list-sort";
import { getGalleryMediaThumbnailUrl } from "@/lib/gallery-media-thumbnail";
import { useGalleryMediaLibrary } from "@/lib/use-gallery-media-library";
import { useGalleryViewMode } from "@/lib/gallery-view-mode";

type BuilderGalleryModalProps = {
  anchor?: BuilderModalAnchor | null;
  isUploading: boolean;
  onSelectImage: (imagePath: string) => void;
  onClose: () => void;
  onUploadImage?: (file: File | null) => void | Promise<void>;
};

export function BuilderGalleryModal({
  anchor = null,
  isUploading,
  onSelectImage,
  onClose,
  onUploadImage
}: BuilderGalleryModalProps) {
  const mounted = useIsHydrated();
  const [viewMode, setViewMode] = useGalleryViewMode();
  const isAnchored = anchor != null;
  const anchoredModalStyle = isAnchored && mounted ? getRichTextGalleryModalStyle() : undefined;

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

  const categoryOptions = useMemo(
    () => buildGalleryMediaCategoryOptions(media.map((item) => item.mediaCategory ?? "")),
    [media]
  );

  function sortByColumn(key: GalleryMediaListSortKey) {
    setFilters((current) => ({ ...current, sort: nextGalleryMediaListSort(current.sort, key) }));
  }

  async function handleUpload(file: File | null) {
    if (!file || !onUploadImage) {
      return;
    }

    await onUploadImage(file);
    await loadMedia();
  }

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className={`builder-gallery-overlay${isAnchored ? " builder-gallery-overlay-anchored" : ""}`}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`builder-gallery-modal${isAnchored ? " builder-gallery-modal-rich-text is-anchored" : ""}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Media gallery"
        style={anchoredModalStyle}
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
            <GalleryViewToggle onChange={setViewMode} value={viewMode} />
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
          <GalleryMediaFilterBar
            categoryOptions={categoryOptions}
            filters={filters}
            onChange={setFilters}
            onClear={clearFilters}
          />
          {viewMode === "list" ? (
            <GalleryMediaListTable
              emptyMessage={isUploading ? "Uploading..." : "No media found in the gallery."}
              isLoading={isLoading}
              items={media}
              onSortColumn={sortByColumn}
              sort={filters.sort}
              trailingColumns={[
                {
                  id: "select",
                  header: "Select",
                  className: "gallery-media-list-action-col",
                  render: (image) => (
                    <button
                      className="submit-button gallery-media-list-select-button"
                      onClick={() => onSelectImage(image.path)}
                      type="button"
                    >
                      Select
                    </button>
                  )
                }
              ]}
            />
          ) : (
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
          )}
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
    </div>,
    document.body
  );
}
