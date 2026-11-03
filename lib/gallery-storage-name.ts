/** Resolve a poll or media URL/path to a gallery storage object name (no Node APIs). */
export function getGalleryStorageName(value: string): string {
  const text = value.trim();

  if (!text) {
    return "";
  }

  try {
    const url = new URL(text);
    const parts = url.pathname.split("/").filter(Boolean);
    const galleryIndex = parts.findIndex((part) => part === "gallery");

    if (galleryIndex >= 0) {
      const storageName = parts.slice(galleryIndex + 1).join("/");

      if (storageName) {
        return decodeURIComponent(storageName);
      }
    }
  } catch {
    // Fall through for relative paths.
  }

  const galleryMarker = "/gallery/";
  const markerIndex = text.indexOf(galleryMarker);

  if (markerIndex >= 0) {
    const storageName = text.slice(markerIndex + galleryMarker.length).split("?")[0]?.split("#")[0] ?? "";

    try {
      return decodeURIComponent(storageName);
    } catch {
      return storageName;
    }
  }

  if (text.startsWith("gallery/")) {
    return text.slice("gallery/".length).split("?")[0]?.split("#")[0] ?? "";
  }

  if (text.startsWith("/api/admin/media-file/gallery/")) {
    return text.replace("/api/admin/media-file/gallery/", "").split("?")[0]?.split("#")[0] ?? "";
  }

  if (text.startsWith("api/admin/media-file/gallery/")) {
    return text.replace("api/admin/media-file/gallery/", "").split("?")[0]?.split("#")[0] ?? "";
  }

  const storageMarker = "/storage/v1/object/public/gallery/";
  const storageIndex = text.indexOf(storageMarker);

  if (storageIndex >= 0) {
    return text.slice(storageIndex + storageMarker.length).split("?")[0]?.split("#")[0] ?? "";
  }

  const renderMarker = "/storage/v1/render/image/public/gallery/";
  const renderIndex = text.indexOf(renderMarker);

  if (renderIndex >= 0) {
    return text.slice(renderIndex + renderMarker.length).split("?")[0]?.split("#")[0] ?? "";
  }

  return "";
}
