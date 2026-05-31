"use client";

import { GALLERY_FILTER_EXTENSIONS } from "@/lib/admin-media-shared";
import {
  hasActiveGalleryMediaFilters,
  type GalleryMediaFilters
} from "@/lib/gallery-media-filters";
import {
  GALLERY_MEDIA_SORT_OPTIONS,
  type GalleryMediaKindFilter,
  type GalleryMediaSort
} from "@/lib/gallery-media-query-params";

type GalleryMediaFilterBarProps = {
  filters: GalleryMediaFilters;
  onChange: (updater: (current: GalleryMediaFilters) => GalleryMediaFilters) => void;
  onClear: () => void;
};

export function GalleryMediaFilterBar({ filters, onChange, onClear }: GalleryMediaFilterBarProps) {
  const activeFilters = hasActiveGalleryMediaFilters(filters);

  return (
    <div className="admin-gallery-filter-bar">
      <label className="admin-gallery-filter-field">
        <span className="admin-gallery-filter-label">Filename</span>
        <input
          type="search"
          value={filters.filename}
          onChange={(event) => onChange((current) => ({ ...current, filename: event.target.value }))}
          placeholder="Search filenames"
        />
      </label>
      <label className="admin-gallery-filter-field">
        <span className="admin-gallery-filter-label">Format</span>
        <select
          value={filters.extension}
          onChange={(event) => onChange((current) => ({ ...current, extension: event.target.value }))}
        >
          <option value="">All formats</option>
          {GALLERY_FILTER_EXTENSIONS.map((extension) => (
            <option key={extension} value={extension}>
              {extension}
            </option>
          ))}
        </select>
      </label>
      <label className="admin-gallery-filter-field">
        <span className="admin-gallery-filter-label">Media Type</span>
        <select
          value={filters.kind}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              kind: event.target.value as GalleryMediaKindFilter
            }))
          }
        >
          <option value="">All types</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
        </select>
      </label>
      <label className="admin-gallery-filter-field">
        <span className="admin-gallery-filter-label">Sort</span>
        <select
          value={filters.sort}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              sort: event.target.value as GalleryMediaSort
            }))
          }
        >
          {GALLERY_MEDIA_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {activeFilters ? (
        <div className="admin-gallery-filter-clear">
          <button className="secondary-button" onClick={onClear} type="button">
            Clear
          </button>
        </div>
      ) : null}
    </div>
  );
}
