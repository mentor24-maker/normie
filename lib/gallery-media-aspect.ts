export const GALLERY_MEDIA_ASPECTS = ["tall", "wide", "square"] as const;

export type GalleryMediaAspect = (typeof GALLERY_MEDIA_ASPECTS)[number];

export const DEFAULT_GALLERY_MEDIA_ASPECT: GalleryMediaAspect = "square";

const GALLERY_MEDIA_ASPECT_LABELS: Record<GalleryMediaAspect, string> = {
  tall: "Tall",
  wide: "Wide",
  square: "Square"
};

export function isGalleryMediaAspect(value: string): value is GalleryMediaAspect {
  return (GALLERY_MEDIA_ASPECTS as readonly string[]).includes(value);
}

export function normalizeGalleryMediaAspect(value: unknown): GalleryMediaAspect {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (isGalleryMediaAspect(normalized)) {
    return normalized;
  }

  return DEFAULT_GALLERY_MEDIA_ASPECT;
}

export function galleryMediaAspectLabel(aspect: GalleryMediaAspect): string {
  return GALLERY_MEDIA_ASPECT_LABELS[aspect];
}

/** Ratio band around 1:1 that still reads as square rather than tall or wide. */
const SQUARE_RATIO_TOLERANCE = 0.1;

/** Aspect guess for a freshly picked upload, from the image's natural dimensions. */
export function galleryMediaAspectFromDimensions(width: number, height: number): GalleryMediaAspect {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return DEFAULT_GALLERY_MEDIA_ASPECT;
  }

  const ratio = width / height;

  if (ratio > 1 + SQUARE_RATIO_TOLERANCE) {
    return "wide";
  }

  if (ratio < 1 - SQUARE_RATIO_TOLERANCE) {
    return "tall";
  }

  return "square";
}
