"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { GalleryMediaCardMetadata } from "@/components/gallery-media-card-metadata";
import { GalleryMediaDetailModal } from "@/components/gallery-media-detail-modal";
import { GalleryPollCreatePanel } from "@/components/gallery-poll-create-panel";
import { GalleryPollAssociateMenu } from "@/components/gallery-poll-associate-menu";
import { GalleryMediaFilterBar } from "@/components/gallery-media-filter-bar";
import { readAdminJson } from "@/lib/admin-fetch";
import type { AdminMediaItem } from "@/lib/admin-media-shared";
import { formatGalleryDisplayFileName } from "@/lib/gallery-display-filename";
import { getGalleryMediaThumbnailUrl } from "@/lib/gallery-media-thumbnail";
import type { GalleryMediaAspect } from "@/lib/gallery-media-aspect";
import { buildGalleryMediaCategoryOptions } from "@/lib/gallery-media-category";
import {
  bulkDeleteGalleryMedia,
  bulkUpdateGalleryMediaMetadata,
  buildGalleryBulkMetadataPatch,
  EMPTY_GALLERY_MEDIA_BULK_TARGETS,
  fetchAllGalleryMediaMatching,
  hasGalleryBulkMetadataTargets,
  type GalleryMediaBulkTargets
} from "@/lib/gallery-media-bulk";
import type { GalleryMediaFilters } from "@/lib/gallery-media-filters";
import { useGalleryMarqueeSelection } from "@/lib/use-gallery-marquee-selection";
import { useGalleryMediaLibrary } from "@/lib/use-gallery-media-library";

function mapMetadataPatch(patch: {
  media_category?: string;
  media_type?: string;
  aspect?: GalleryMediaAspect;
}): Partial<AdminMediaItem> {
  return {
    ...(patch.media_category !== undefined ? { mediaCategory: patch.media_category } : {}),
    ...(patch.media_type !== undefined ? { mediaType: patch.media_type } : {}),
    ...(patch.aspect !== undefined ? { aspect: patch.aspect } : {})
  };
}

function storageNameForItem(item: AdminMediaItem): string {
  return item.storageName ?? item.name;
}

export function AdminGalleryWorkspace() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedStorageNames, setSelectedStorageNames] = useState<Set<string>>(() => new Set());
  const [associateStorageName, setAssociateStorageName] = useState<string | null>(null);
  const [bulkAssociateOpen, setBulkAssociateOpen] = useState(false);
  const [generateTarget, setGenerateTarget] = useState<{
    storageName: string;
    fileName: string;
    imagePath: string;
  } | null>(null);
  const [detailItem, setDetailItem] = useState<AdminMediaItem | null>(null);
  const [listFiltersSnapshot, setListFiltersSnapshot] = useState<GalleryMediaFilters | null>(null);
  const [bulkTargets, setBulkTargets] = useState<GalleryMediaBulkTargets>(EMPTY_GALLERY_MEDIA_BULK_TARGETS);
  const [isResolvingBulkSelection, setIsResolvingBulkSelection] = useState(false);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const associateWrapRef = useRef<HTMLDivElement | null>(null);
  const bulkAssociateWrapRef = useRef<HTMLDivElement | null>(null);
  const generateWrapRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!associateStorageName && !bulkAssociateOpen && !generateTarget) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      const insideAssociate = associateWrapRef.current?.contains(target);
      const insideBulkAssociate = bulkAssociateWrapRef.current?.contains(target);
      const insideGenerate = generateWrapRef.current?.contains(target);

      if (!insideAssociate && !insideBulkAssociate && !insideGenerate) {
        setAssociateStorageName(null);
        setBulkAssociateOpen(false);
        setGenerateTarget(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [associateStorageName, bulkAssociateOpen, generateTarget]);

  const {
    media,
    total,
    isLoading,
    filters,
    debouncedFilename,
    setFilters,
    loadMedia,
    clearFilters,
    rangeStart,
    rangeEnd,
    canLoadMore,
    loadError
  } = useGalleryMediaLibrary({
    syncOnFirstLoad: true,
    listQueryFilters: listFiltersSnapshot
  });

  const bulkEditActive = selectedStorageNames.size > 0;
  const selectedCount = selectedStorageNames.size;
  const checkAllChecked = total > 0 && selectedCount === total;
  const checkAllIndeterminate = selectedCount > 0 && !checkAllChecked;

  const categoryOptions = useMemo(
    () => buildGalleryMediaCategoryOptions(media.map((item) => item.mediaCategory ?? "")),
    [media]
  );

  const selectedStorageNamesInOrder = useMemo(
    () =>
      media
        .map((item) => storageNameForItem(item))
        .filter((name) => selectedStorageNames.has(name)),
    [media, selectedStorageNames]
  );

  function buildListFiltersSnapshot(): GalleryMediaFilters {
    return {
      ...filters,
      filename: debouncedFilename
    };
  }

  function clearBulkSelection() {
    setSelectedStorageNames(new Set());
    setListFiltersSnapshot(null);
    setBulkTargets(EMPTY_GALLERY_MEDIA_BULK_TARGETS);
  }

  function ensureBulkEditSnapshot() {
    if (listFiltersSnapshot) {
      return listFiltersSnapshot;
    }

    const snapshot = buildListFiltersSnapshot();
    setListFiltersSnapshot(snapshot);
    return snapshot;
  }

  function setBulkSelection(next: Set<string>) {
    if (next.size === 0) {
      clearBulkSelection();
      return;
    }

    ensureBulkEditSnapshot();
    setSelectedStorageNames(next);
  }

  const selectionBusy = isResolvingBulkSelection || isBulkEditing || isBulkDeleting;

  const {
    gridRef,
    marqueeRect,
    previewStorageNames,
    isDragging: isMarqueeDragging,
    handleGridPointerDownCapture
  } = useGalleryMarqueeSelection({
    enabled: !selectionBusy && media.length > 0,
    selectedStorageNames,
    onSelectionBegin: () => {
      ensureBulkEditSnapshot();
    },
    onSelectionChange: setBulkSelection
  });

  function toggleCardSelection(storageName: string, checked: boolean) {
    if (!checked) {
      setSelectedStorageNames((current) => {
        const next = new Set(current);
        next.delete(storageName);

        if (next.size === 0) {
          setListFiltersSnapshot(null);
          setBulkTargets(EMPTY_GALLERY_MEDIA_BULK_TARGETS);
        }

        return next;
      });
      return;
    }

    ensureBulkEditSnapshot();
    setSelectedStorageNames((current) => new Set(current).add(storageName));
  }

  async function handleCheckAllChange(checked: boolean) {
    if (!checked) {
      clearBulkSelection();
      return;
    }

    const snapshot = ensureBulkEditSnapshot();
    setIsResolvingBulkSelection(true);
    setError(null);

    try {
      const items = await fetchAllGalleryMediaMatching(snapshot);
      const names = items.map(storageNameForItem).filter((name) => name.length > 0);

      if (names.length === 0) {
        setMessage(null);
        setError("No files match the current filters.");
        clearBulkSelection();
        return;
      }

      setSelectedStorageNames(new Set(names));
    } catch (selectionError) {
      clearBulkSelection();
      setError(
        selectionError instanceof Error
          ? selectionError.message
          : "Failed to select gallery media for bulk edit."
      );
    } finally {
      setIsResolvingBulkSelection(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedCount === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedCount} file${selectedCount === 1 ? "" : "s"} from the gallery? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setIsBulkDeleting(true);
    setError(null);
    setMessage(null);

    try {
      const { deleted } = await bulkDeleteGalleryMedia([...selectedStorageNames]);
      clearBulkSelection();
      setAssociateStorageName(null);
      setGenerateTarget(null);
      setDetailItem(null);
      await loadMedia();
      setMessage(
        deleted === 1 ? "Deleted 1 file from the gallery." : `Deleted ${deleted} files from the gallery.`
      );
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete gallery media.");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  async function handleBulkEdit() {
    if (!bulkEditActive || selectedCount === 0) {
      return;
    }

    if (!hasGalleryBulkMetadataTargets(bulkTargets)) {
      setError("Choose at least one of Category, Type, or Aspect to apply.");
      setMessage(null);
      return;
    }

    const patch = buildGalleryBulkMetadataPatch(bulkTargets);

    setIsBulkEditing(true);
    setError(null);
    setMessage(null);

    try {
      const { updated } = await bulkUpdateGalleryMediaMetadata([...selectedStorageNames], patch);
      await loadMedia();
      setMessage(
        updated === 1
          ? "Updated metadata for 1 file."
          : `Updated metadata for ${updated} files.`
      );
      clearBulkSelection();
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "Failed to bulk update gallery media.");
    } finally {
      setIsBulkEditing(false);
    }
  }

  function handleClearFilters() {
    clearBulkSelection();
    clearFilters();
  }

  async function patchGalleryMetadata(
    item: AdminMediaItem,
    patch: {
      media_category?: string;
      media_type?: string;
      aspect?: GalleryMediaAspect;
    },
    successMessage?: string
  ) {
    const storageName = storageNameForItem(item);

    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storageName, ...patch })
      });
      const data = await readAdminJson<{ error?: string }>(response, "Failed to update gallery media.");

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update gallery media.");
      }

      if (successMessage) {
        setMessage(successMessage);
      }

      await loadMedia();

      if (detailItem && storageNameForItem(detailItem) === storageName) {
        setDetailItem((current) => (current ? { ...current, ...mapMetadataPatch(patch) } : current));
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update gallery media.");
    }
  }

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

  const displayError = error ?? loadError;

  return (
    <section className="admin-stack">
      <section className="admin-section">
        <div className="panel-label">Gallery</div>
        <h2>Gallery Media Library</h2>
        <p className="page-copy admin-copy">
          Files live in the Supabase Storage <code>gallery</code> bucket. Set Type to Badge on an image to include it in
          reward badge symbol pickers.
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
              {bulkEditActive
                ? isResolvingBulkSelection
                  ? "Selecting all files that match the current filters..."
                  : `Bulk edit: ${selectedCount} file${selectedCount === 1 ? "" : "s"} selected. Drag across tiles to select more. Hold Shift to add. Then Edit or Delete.`
                : isLoading && media.length === 0
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

        <GalleryMediaFilterBar
          bulkDeleteDisabled={
            isResolvingBulkSelection || isBulkEditing || isBulkDeleting || selectedCount === 0
          }
          bulkEditActive={bulkEditActive}
          bulkEditDisabled={
            !bulkEditActive ||
            isResolvingBulkSelection ||
            isBulkEditing ||
            isBulkDeleting ||
            selectedCount === 0 ||
            !hasGalleryBulkMetadataTargets(bulkTargets)
          }
          bulkTargets={bulkTargets}
          categoryOptions={categoryOptions}
          checkAllChecked={checkAllChecked}
          checkAllIndeterminate={checkAllIndeterminate}
          checkAllDisabled={isResolvingBulkSelection || isBulkEditing || isBulkDeleting}
          filters={filters}
          isBulkDeleting={isBulkDeleting}
          isBulkEditing={isBulkEditing}
          bulkAssociateDisabled={selectionBusy || selectedCount === 0}
          bulkAssociateOpen={bulkAssociateOpen}
          bulkAssociateWrapRef={bulkAssociateWrapRef}
          onBulkAssociateToggle={() => {
            setAssociateStorageName(null);
            setGenerateTarget(null);
            setBulkAssociateOpen((current) => !current);
          }}
          onBulkDelete={() => void handleBulkDelete()}
          onBulkEdit={() => void handleBulkEdit()}
          onBulkTargetsChange={setBulkTargets}
          onChange={setFilters}
          onCheckAllChange={(checked) => void handleCheckAllChange(checked)}
          onClear={handleClearFilters}
          selectedCount={selectedCount}
          selectedStorageNamesInOrder={selectedStorageNamesInOrder}
          showFiltersHeading
          onBulkAssociated={(text) => {
            setMessage(text);
            setError(null);
            setBulkAssociateOpen(false);
            void loadMedia();
          }}
          onBulkAssociateError={setError}
        />

        <div
          className={`builder-gallery-grid admin-gallery-media-grid${isMarqueeDragging ? " is-marquee-dragging" : ""}`}
          onPointerDownCapture={handleGridPointerDownCapture}
          ref={gridRef}
        >
          {marqueeRect ? (
            <div
              className="admin-gallery-marquee"
              style={{
                left: `${marqueeRect.left}px`,
                top: `${marqueeRect.top}px`,
                width: `${marqueeRect.width}px`,
                height: `${marqueeRect.height}px`
              }}
            />
          ) : null}
          {media.map((item) => {
            const storageName = storageNameForItem(item);
            const isSelected = selectedStorageNames.has(storageName);
            const isPreviewSelected = previewStorageNames.has(storageName);
            const displayName = formatGalleryDisplayFileName(item.name);

            return (
              <article
                className={`builder-gallery-card builder-gallery-card-static admin-gallery-library-card${isSelected || isPreviewSelected ? " is-bulk-selected" : ""}${isPreviewSelected && !isSelected ? " is-marquee-preview" : ""}`}
                data-gallery-storage-name={storageName}
                key={item.path}
              >
                <label className="admin-gallery-card-select">
                  <input
                    aria-label={`Select ${item.name}`}
                    checked={isSelected}
                    disabled={selectionBusy}
                    onChange={(event) => toggleCardSelection(storageName, event.target.checked)}
                    type="checkbox"
                  />
                </label>
                <div className="builder-gallery-thumb">
                  {item.kind === "image" ? (
                    <Image
                      alt={item.name}
                      draggable={false}
                      fill
                      sizes="(min-width: 1200px) 25vw, 50vw"
                      src={getGalleryMediaThumbnailUrl(item.path)}
                    />
                  ) : (
                    <video className="builder-gallery-video" controls preload="metadata" src={item.path} />
                  )}
                </div>
                <div className="admin-gallery-file-name-slot">
                  <button
                    className="admin-gallery-file-name-button"
                    onClick={() => {
                      setAssociateStorageName(null);
                      setGenerateTarget(null);
                      setDetailItem(item);
                    }}
                    title={item.name}
                    type="button"
                  >
                    <span className="admin-gallery-file-name">{displayName}</span>
                  </button>
                </div>
                <span className="gallery-meta admin-gallery-card-meta">
                  {item.directory} · {item.kind}
                </span>
                <GalleryMediaCardMetadata item={item} />
                {item.kind === "image" ? (
                  <div className="admin-gallery-card-actions">
                    <div className="admin-gallery-card-action-buttons">
                      <div
                        className="admin-gallery-popup-wrap"
                        ref={associateStorageName === storageName ? associateWrapRef : undefined}
                      >
                        <button
                          className="secondary-button admin-gallery-action-button"
                          onClick={() => {
                            setGenerateTarget(null);
                            setBulkAssociateOpen(false);
                            setAssociateStorageName((current) =>
                              current === storageName ? null : storageName
                            );
                          }}
                          type="button"
                        >
                          Associate
                        </button>
                        {associateStorageName === storageName ? (
                          <GalleryPollAssociateMenu
                            onAssociated={(text) => {
                              setMessage(text);
                              setError(null);
                              setAssociateStorageName(null);
                            }}
                            onClose={() => setAssociateStorageName(null)}
                            onError={setError}
                            storageNames={[storageName]}
                          />
                        ) : null}
                      </div>
                      <div
                        className="admin-gallery-popup-wrap"
                        ref={
                          generateTarget?.storageName === storageName ? generateWrapRef : undefined
                        }
                      >
                        <button
                          className="secondary-button admin-gallery-action-button"
                          onClick={() => {
                            setAssociateStorageName(null);
                            setGenerateTarget((current) =>
                              current?.storageName === storageName
                                ? null
                                : {
                                    storageName,
                                    fileName: item.name,
                                    imagePath: item.path
                                  }
                            );
                          }}
                          type="button"
                        >
                          Generate
                        </button>
                        {generateTarget?.storageName === storageName ? (
                          <GalleryPollCreatePanel
                            fileName={generateTarget.fileName}
                            imagePath={generateTarget.imagePath}
                            onClose={() => setGenerateTarget(null)}
                            onCreated={(text) => {
                              setMessage(text);
                              setError(null);
                              setGenerateTarget(null);
                            }}
                            onError={setError}
                            storageName={generateTarget.storageName}
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
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

      {detailItem ? (
        <GalleryMediaDetailModal
          categoryOptions={categoryOptions}
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onError={setError}
          onPatch={(patch, successMessage) => void patchGalleryMetadata(detailItem, patch, successMessage)}
        />
      ) : null}
    </section>
  );
}
