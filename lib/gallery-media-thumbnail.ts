export const GALLERY_MEDIA_THUMB_SIZE = 180;

/**
 * Supabase Storage image transform URL for grid thumbnails.
 * Selection still uses the original `path` from AdminMediaItem.
 */
export function getGalleryMediaThumbnailUrl(path: string, size = GALLERY_MEDIA_THUMB_SIZE): string {
  const trimmed = path.trim();

  if (!trimmed) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const objectMatch = url.pathname.match(/^\/storage\/v1\/object\/public\/gallery\/(.+)$/i);

    if (objectMatch) {
      const objectPath = objectMatch[1];
      url.pathname = `/storage/v1/render/image/public/gallery/${objectPath}`;
      url.search = `width=${size}&height=${size}&resize=contain`;
      return url.toString();
    }
  } catch {
    // Fall through for relative paths.
  }

  return trimmed;
}
