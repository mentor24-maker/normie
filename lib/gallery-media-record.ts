import {
  DEFAULT_GALLERY_MEDIA_ASPECT,
  normalizeGalleryMediaAspect,
  type GalleryMediaAspect
} from "@/lib/gallery-media-aspect";
import { normalizeGalleryMediaCategory } from "@/lib/gallery-media-category";
import { normalizeGalleryMediaType } from "@/lib/gallery-media-type";

export const GALLERY_MEDIA_RECORD_SELECT_FULL =
  "storage_name, badge, media_category, media_type, aspect, created_at, updated_at";

export const GALLERY_MEDIA_RECORD_SELECT_LEGACY = "storage_name, badge, created_at, updated_at";

export type GalleryMediaRecordRow = {
  storage_name: string;
  badge: boolean;
  media_category?: string | null;
  media_type?: string | null;
  aspect?: string | null;
  created_at?: string;
  updated_at: string;
};

export function isMissingGalleryMediaColumnError(message: string): boolean {
  const text = message.toLowerCase();

  return (
    text.includes("does not exist") &&
    (text.includes("media_category") ||
      text.includes("media_type") ||
      text.includes("aspect") ||
      text.includes("gallery_media"))
  );
}

export function normalizeGalleryMediaRecordRow(row: GalleryMediaRecordRow): {
  storage_name: string;
  badge: boolean;
  media_category: string;
  media_type: string;
  aspect: GalleryMediaAspect;
  created_at?: string;
  updated_at: string;
} {
  return {
    storage_name: row.storage_name,
    badge: row.badge,
    media_category: normalizeGalleryMediaCategory(row.media_category),
    media_type: normalizeGalleryMediaType(row.media_type),
    aspect: normalizeGalleryMediaAspect(row.aspect),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export function defaultGalleryMediaMetadata(): {
  media_category: string;
  media_type: string;
  aspect: GalleryMediaAspect;
} {
  return {
    media_category: "",
    media_type: "",
    aspect: DEFAULT_GALLERY_MEDIA_ASPECT
  };
}
