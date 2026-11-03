/**
 * Gallery bucket upload names: `{base}-{6-digit-suffix}{extension}`
 * Legacy pattern was `{13-digit-timestamp}-{base}{extension}`.
 */

const LEGACY_TIMESTAMP_PREFIX = /^(\d{10,})-(.+)$/;

export function galleryUploadSuffixSixDigits(now = Date.now()): string {
  return String(now).slice(-6);
}

export function buildGalleryUploadFileName(baseName: string, extension: string, now = Date.now()): string {
  const safeBase = baseName.trim() || "upload";
  const normalizedExtension = extension.startsWith(".")
    ? extension.toLowerCase()
    : `.${extension.toLowerCase()}`;

  return `${safeBase}-${galleryUploadSuffixSixDigits(now)}${normalizedExtension}`;
}

export function isLegacyGalleryTimestampPrefixName(fileName: string): boolean {
  const base = fileName.split("/").filter(Boolean).pop() ?? fileName;
  return LEGACY_TIMESTAMP_PREFIX.test(base);
}

/**
 * Converts `1780080401685-icon_standard.png` → `icon_standard-801685.png`.
 * Returns null when the name is not a legacy timestamp-prefixed upload.
 */
export function legacyGalleryFileNameToNewName(fileName: string): string | null {
  const base = fileName.split("/").filter(Boolean).pop() ?? fileName;
  const match = base.match(/^(\d{10,})-(.+?)(\.[^.]+)$/i);

  if (!match) {
    return null;
  }

  const [, timestamp, stem, extension] = match;
  return `${stem}-${timestamp.slice(-6)}${extension.toLowerCase()}`;
}
