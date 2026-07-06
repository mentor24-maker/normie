export const RICH_TEXT_IMAGE_CLASS = "rich-text-editor-image";

function normalizeRichTextImagePath(value: string) {
  const text = value.trim();

  if (!text) {
    return "";
  }

  if (text.startsWith("gallery/")) {
    return `/${text}`;
  }

  if (text.startsWith("/gallery/")) {
    return text;
  }

  if (text.startsWith("/api/admin/media-file/gallery/")) {
    return text.replace("/api/admin/media-file/gallery/", "/gallery/");
  }

  if (text.startsWith("api/admin/media-file/gallery/")) {
    return `/${text.replace("api/admin/media-file/gallery/", "gallery/")}`;
  }

  try {
    const url = new URL(text);

    if (url.pathname.startsWith("/api/admin/media-file/gallery/")) {
      return url.pathname.replace("/api/admin/media-file/gallery/", "/gallery/") + url.search;
    }

    if (url.pathname.startsWith("/gallery/")) {
      return `${url.pathname}${url.search}`;
    }

    const supabaseGallery = url.pathname.match(
      /^\/storage\/v1\/(?:object\/public|render\/image\/public)\/gallery\/(.+)$/i
    );

    if (supabaseGallery?.[1]) {
      try {
        return `/gallery/${decodeURIComponent(supabaseGallery[1])}`;
      } catch {
        return `/gallery/${supabaseGallery[1]}`;
      }
    }
  } catch {
    return text;
  }

  return text;
}

export type RichTextImageSrcMode = "editor" | "display" | "storage";

export function isAllowedRichTextImageSrc(src: string) {
  const trimmed = src.trim();

  if (!trimmed || /^\s*javascript:/i.test(trimmed)) {
    return false;
  }

  const normalized = normalizeRichTextImagePath(trimmed);

  if (!normalized) {
    return false;
  }

  if (normalized.startsWith("/gallery/") || normalized.startsWith("/api/admin/media-file/")) {
    return true;
  }

  if (normalized.startsWith("gallery/") || normalized.startsWith("api/admin/media-file/")) {
    return true;
  }

  try {
    const url = new URL(normalized, "https://www.normie.one");

    if (url.pathname.startsWith("/gallery/") || url.pathname.startsWith("/api/admin/media-file/")) {
      return true;
    }

    if (url.origin === "https://www.normie.one" || url.origin === "http://localhost:3000") {
      return url.pathname.startsWith("/gallery/") || url.pathname.startsWith("/api/admin/media-file/");
    }
  } catch {
    return false;
  }

  return false;
}

export function resolveRichTextImageSrc(src: string, mode: RichTextImageSrcMode) {
  const normalized = normalizeRichTextImagePath(src);

  if (!normalized || !isAllowedRichTextImageSrc(normalized)) {
    return "";
  }

  const galleryPath = normalized.startsWith("/gallery/")
    ? normalized
    : normalized.startsWith("/api/admin/media-file/gallery/")
      ? normalized.replace("/api/admin/media-file/gallery/", "/gallery/")
      : "";

  if (mode === "storage") {
    return galleryPath || normalized;
  }

  if (galleryPath) {
    return mode === "display" ? galleryPath : `/api/admin/media-file${galleryPath}`;
  }

  if (normalized.startsWith("/api/admin/media-file/")) {
    return mode === "display"
      ? normalized.replace("/api/admin/media-file/", "/media/")
      : normalized;
  }

  return "";
}
