import { normalizeBuilderAssetUrl, resolvePublicBuilderAssetUrl } from "@/lib/builder-asset-url";
import { buildSupabaseGalleryPublicUrl } from "@/lib/gallery-public-url";
import { getGalleryMediaThumbnailUrl } from "@/lib/gallery-media-thumbnail";
import {
  buildPollGalleryImageUrl,
  resolvePollGalleryStorageName
} from "@/lib/poll-gallery-link-core";
import { resolveRichTextImageSrc } from "@/lib/rich-text-image";

export const POLL_TABLE_THUMB_WIDTH = 75;

/** Thumbnail src for Polls Manager table (poll `image_url`). */
export function resolvePollTableThumbnailSrc(
  imageUrl: string,
  width = POLL_TABLE_THUMB_WIDTH
): string {
  const normalized = normalizeBuilderAssetUrl(imageUrl).trim();

  if (!normalized) {
    return "";
  }

  const storageName = resolvePollGalleryStorageName(normalized);

  if (storageName) {
    const publicUrl = buildSupabaseGalleryPublicUrl(storageName);

    if (publicUrl) {
      return getGalleryMediaThumbnailUrl(publicUrl, width);
    }

    const publicPath = resolvePublicBuilderAssetUrl(buildPollGalleryImageUrl(storageName));

    if (publicPath.startsWith("/gallery/")) {
      const publicUrl = buildSupabaseGalleryPublicUrl(storageName);

      if (publicUrl) {
        return getGalleryMediaThumbnailUrl(publicUrl, width);
      }
    }

    return publicPath;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return getGalleryMediaThumbnailUrl(normalized, width);
  }

  return resolvePublicBuilderAssetUrl(normalized);

  return "";
}
