import type { AdminMediaItem } from "@/lib/admin-media-shared";
import { isGalleryBadgeMediaType } from "@/lib/gallery-media-badge-type";
import { galleryMediaAspectLabel, normalizeGalleryMediaAspect } from "@/lib/gallery-media-aspect";
import { GALLERY_MEDIA_BADGE_TYPE } from "@/lib/gallery-media-type";

export function formatGalleryMediaCategoryDisplay(value: string | undefined): string {
  const text = value?.trim();

  return text ? text : "—";
}

export function formatGalleryMediaTypeDisplay(value: string | undefined, item?: AdminMediaItem): string {
  const text = value?.trim();

  if (text) {
    return isGalleryBadgeMediaType(text) ? GALLERY_MEDIA_BADGE_TYPE : text;
  }

  if (item && (item.badge || isGalleryBadgeMediaType(item.mediaType))) {
    return GALLERY_MEDIA_BADGE_TYPE;
  }

  return "—";
}

export function formatGalleryMediaAspectDisplay(item: AdminMediaItem): string {
  return galleryMediaAspectLabel(normalizeGalleryMediaAspect(item.aspect));
}

export function formatGalleryMediaCreatedAtDisplay(value: string | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
