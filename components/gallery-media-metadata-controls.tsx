"use client";

import {
  GALLERY_MEDIA_ASPECTS,
  galleryMediaAspectLabel,
  type GalleryMediaAspect
} from "@/lib/gallery-media-aspect";
import { GALLERY_MEDIA_TYPES } from "@/lib/gallery-media-type";

type GalleryMediaMetadataControlsProps = {
  mediaCategory: string;
  mediaType: string;
  aspect: GalleryMediaAspect;
  categoryOptions: string[];
  disabled?: boolean;
  onCategoryChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onAspectChange: (value: GalleryMediaAspect) => void;
};

export function GalleryMediaMetadataControls({
  mediaCategory,
  mediaType,
  aspect,
  categoryOptions,
  disabled = false,
  onCategoryChange,
  onTypeChange,
  onAspectChange
}: GalleryMediaMetadataControlsProps) {
  return (
    <div className="admin-gallery-metadata-controls">
      <label className="admin-gallery-metadata-field">
        <span className="admin-gallery-metadata-label">Media Category</span>
        <select
          disabled={disabled}
          value={mediaCategory}
          onChange={(event) => onCategoryChange(event.target.value)}
        >
          <option value="">Uncategorized</option>
          {categoryOptions.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label className="admin-gallery-metadata-field">
        <span className="admin-gallery-metadata-label">Media Type</span>
        <select
          disabled={disabled}
          value={mediaType}
          onChange={(event) => onTypeChange(event.target.value)}
        >
          <option value="">Unspecified</option>
          {GALLERY_MEDIA_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label className="admin-gallery-metadata-field">
        <span className="admin-gallery-metadata-label">Aspect</span>
        <select
          disabled={disabled}
          value={aspect}
          onChange={(event) => onAspectChange(event.target.value as GalleryMediaAspect)}
        >
          {GALLERY_MEDIA_ASPECTS.map((value) => (
            <option key={value} value={value}>
              {galleryMediaAspectLabel(value)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
