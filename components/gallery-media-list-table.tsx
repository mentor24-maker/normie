"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import type { AdminMediaItem } from "@/lib/admin-media-shared";
import { formatGalleryDisplayFileName } from "@/lib/gallery-display-filename";
import {
  formatGalleryMediaAspectDisplay,
  formatGalleryMediaCategoryDisplay,
  formatGalleryMediaCreatedAtDisplay,
  formatGalleryMediaTypeDisplay
} from "@/lib/gallery-media-display";
import {
  galleryMediaListAriaSort,
  type GalleryMediaListSortKey
} from "@/lib/gallery-media-list-sort";
import { getGalleryMediaThumbnailUrl } from "@/lib/gallery-media-thumbnail";
import type { GalleryMediaSort } from "@/lib/gallery-media-query-params";

/** Extra column a host surface bolts onto the left (selection) or right (actions). */
export type GalleryMediaListColumn = {
  id: string;
  header: ReactNode;
  className?: string;
  render: (item: AdminMediaItem) => ReactNode;
};

type GalleryMediaListTableProps = {
  items: AdminMediaItem[];
  sort: GalleryMediaSort;
  onSortColumn: (key: GalleryMediaListSortKey) => void;
  isLoading: boolean;
  emptyMessage: string;
  leadingColumns?: GalleryMediaListColumn[];
  trailingColumns?: GalleryMediaListColumn[];
  /** When set, the file name becomes a button (the admin library opens the detail modal). */
  onOpenItem?: (item: AdminMediaItem) => void;
  getRowClassName?: (item: AdminMediaItem) => string;
};

const SORTABLE_COLUMNS: { key: GalleryMediaListSortKey; label: string; className?: string }[] = [
  { key: "name", label: "File Name", className: "gallery-media-list-name-col" },
  { key: "category", label: "Category" },
  { key: "type", label: "Type" },
  { key: "aspect", label: "Aspect" },
  { key: "createdAt", label: "Create Date", className: "gallery-media-list-date-col" }
];

export function GalleryMediaListTable({
  items,
  sort,
  onSortColumn,
  isLoading,
  emptyMessage,
  leadingColumns = [],
  trailingColumns = [],
  onOpenItem,
  getRowClassName
}: GalleryMediaListTableProps) {
  function renderSortHeader(key: GalleryMediaListSortKey, label: string, className?: string) {
    const ariaSort = galleryMediaListAriaSort(sort, key);
    const isSorted = ariaSort !== "none";

    return (
      <th
        aria-sort={ariaSort}
        className={`gallery-media-list-sortable${className ? ` ${className}` : ""}${isSorted ? " is-sorted" : ""}`}
        key={key}
        onClick={() => onSortColumn(key)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSortColumn(key);
          }
        }}
        scope="col"
        tabIndex={0}
      >
        <span className="gallery-media-list-sort-label">
          {label}
          <span aria-hidden="true" className="gallery-media-list-sort-arrow">
            {isSorted ? (ariaSort === "ascending" ? "▲" : "▼") : ""}
          </span>
        </span>
      </th>
    );
  }

  return (
    <div className="gallery-media-list-wrap">
      <table className="gallery-media-list">
        <thead>
          <tr>
            {leadingColumns.map((column) => (
              <th className={column.className} key={column.id} scope="col">
                {column.header}
              </th>
            ))}
            <th className="gallery-media-list-thumb-col" scope="col">
              Preview
            </th>
            {SORTABLE_COLUMNS.map((column) =>
              renderSortHeader(column.key, column.label, column.className)
            )}
            {trailingColumns.map((column) => (
              <th className={column.className} key={column.id} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const displayName = formatGalleryDisplayFileName(item.name);
            const rowClassName = getRowClassName?.(item) ?? "";

            return (
              <tr className={rowClassName || undefined} key={item.path}>
                {leadingColumns.map((column) => (
                  <td className={column.className} key={column.id}>
                    {column.render(item)}
                  </td>
                ))}
                <td className="gallery-media-list-thumb-col">
                  <span className="gallery-media-list-thumb">
                    {item.kind === "image" ? (
                      <Image
                        alt={item.name}
                        fill
                        sizes="56px"
                        src={getGalleryMediaThumbnailUrl(item.path)}
                      />
                    ) : (
                      <span className="gallery-media-list-video-tag">Video</span>
                    )}
                  </span>
                </td>
                <td className="gallery-media-list-name-col">
                  {onOpenItem ? (
                    <button
                      className="gallery-media-list-name-button"
                      onClick={() => onOpenItem(item)}
                      title={item.name}
                      type="button"
                    >
                      {displayName}
                    </button>
                  ) : (
                    <span title={item.name}>{displayName}</span>
                  )}
                </td>
                <td>{formatGalleryMediaCategoryDisplay(item.mediaCategory)}</td>
                <td>{formatGalleryMediaTypeDisplay(item.mediaType, item)}</td>
                <td>{formatGalleryMediaAspectDisplay(item)}</td>
                <td className="gallery-media-list-date-col">
                  {formatGalleryMediaCreatedAtDisplay(item.createdAt)}
                </td>
                {trailingColumns.map((column) => (
                  <td className={column.className} key={column.id}>
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {!isLoading && items.length === 0 ? (
        <div className="builder-gallery-empty">{emptyMessage}</div>
      ) : null}
    </div>
  );
}
