import { legacyGalleryFileNameToNewName } from "@/lib/gallery-upload-filename";

export type GalleryFileNameParts = {
  stem: string;
  tail: string;
};

const GALLERY_SUFFIX_PATTERN = /^(.+)-(\d{6})(\.[^.]+)$/i;

/** Max characters shown from the stem before `...` and the `-######.ext` tail. */
export const GALLERY_DISPLAY_STEM_MAX_CHARS = 34;

function galleryFileBaseName(fileName: string): string {
  return fileName.split("/").filter(Boolean).pop() ?? fileName;
}

export function parseGalleryUploadFileName(fileName: string): GalleryFileNameParts | null {
  const base = galleryFileBaseName(fileName);
  const match = base.match(GALLERY_SUFFIX_PATTERN);

  if (!match) {
    return null;
  }

  const [, stem, suffixDigits, extension] = match;
  const tail = `-${suffixDigits}${extension.toLowerCase()}`;

  return {
    stem,
    tail
  };
}

function normalizeGalleryFileNameForDisplay(fileName: string): string {
  const legacy = legacyGalleryFileNameToNewName(fileName);

  if (legacy) {
    return legacy;
  }

  return galleryFileBaseName(fileName);
}

/**
 * Gallery card label: stem (optionally shortened) + `...` + `-######.ext` when the stem is long.
 * Names without the upload suffix pattern are returned unchanged.
 */
export function formatGalleryDisplayFileName(
  fileName: string,
  maxStemChars = GALLERY_DISPLAY_STEM_MAX_CHARS
): string {
  const normalized = normalizeGalleryFileNameForDisplay(fileName);
  const parts = parseGalleryUploadFileName(normalized);

  if (!parts) {
    return normalized;
  }

  if (parts.stem.length <= maxStemChars) {
    return `${parts.stem}${parts.tail}`;
  }

  return `${parts.stem.slice(0, maxStemChars)}...${parts.tail}`;
}

/** Human-readable hint from a gallery upload filename (not AI-generated). */
export function galleryFileNameToQuestionHint(fileName: string): string {
  const normalized = normalizeGalleryFileNameForDisplay(fileName);
  const parts = parseGalleryUploadFileName(normalized);
  const stem = parts?.stem ?? normalized.replace(/\.[^.]+$/i, "");
  const words = stem
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "";
  }

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
