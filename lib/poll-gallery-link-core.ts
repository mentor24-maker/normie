import { normalizeBuilderAssetUrl } from "@/lib/builder-asset-url";
import { getGalleryStorageName } from "@/lib/gallery-storage-name";

/** Canonical poll image path stored in `polls.image_url` for gallery files. */
export function buildPollGalleryImageUrl(storageName: string): string {
  const normalizedName = storageName.trim().replace(/^\/+/, "");

  if (!normalizedName) {
    return "";
  }

  return normalizeBuilderAssetUrl(`/gallery/${normalizedName}`);
}

/** Resolve `polls.image_url` to a gallery `storage_name`, or "" if not gallery-linked. */
export function resolvePollGalleryStorageName(imageUrl: string | null | undefined): string {
  const normalized = normalizeBuilderAssetUrl(String(imageUrl ?? "").trim());

  if (!normalized) {
    return "";
  }

  return getGalleryStorageName(normalized);
}

/** True when the poll image URL points at a gallery file (same rule as Gallery → Poll filter). */
export function pollHasGalleryImageLink(imageUrl: string | null | undefined): boolean {
  return resolvePollGalleryStorageName(imageUrl).length > 0;
}

export function normalizePollImageUrlForSave(imageUrl: unknown): {
  image_url: string;
  storageName: string;
} {
  const normalized = normalizeBuilderAssetUrl(imageUrl);
  const storageName = resolvePollGalleryStorageName(normalized);

  if (storageName) {
    return {
      image_url: buildPollGalleryImageUrl(storageName),
      storageName
    };
  }

  return {
    image_url: normalized,
    storageName: ""
  };
}
