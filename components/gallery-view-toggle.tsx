"use client";

import { GALLERY_VIEW_MODES, type GalleryViewMode } from "@/lib/gallery-view-mode";

const GALLERY_VIEW_MODE_LABELS: Record<GalleryViewMode, string> = {
  gallery: "Gallery",
  list: "List"
};

type GalleryViewToggleProps = {
  value: GalleryViewMode;
  onChange: (mode: GalleryViewMode) => void;
};

/** Gallery / List switch shared by every surface that shows gallery media. */
export function GalleryViewToggle({ value, onChange }: GalleryViewToggleProps) {
  return (
    <div aria-label="Gallery layout" className="gallery-view-toggle" role="group">
      {GALLERY_VIEW_MODES.map((mode) => (
        <button
          aria-pressed={value === mode}
          className={value === mode ? "is-active" : ""}
          key={mode}
          onClick={() => onChange(mode)}
          type="button"
        >
          {GALLERY_VIEW_MODE_LABELS[mode]}
        </button>
      ))}
    </div>
  );
}
