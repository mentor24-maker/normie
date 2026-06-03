/** Case-insensitive membership for gallery `storage_name` values. */
export function galleryStorageNameInSet(storageName: string, names: Set<string>): boolean {
  const trimmed = storageName.trim();

  if (!trimmed) {
    return false;
  }

  if (names.has(trimmed)) {
    return true;
  }

  const lower = trimmed.toLowerCase();

  for (const name of names) {
    if (name.toLowerCase() === lower) {
      return true;
    }
  }

  return false;
}

/** Map poll-linked names to canonical `gallery_media.storage_name` values for `.in()` filters. */
export function resolveGalleryIndexStorageNamesForPollLinks(
  pollLinkedNames: string[],
  indexStorageNames: string[]
): string[] {
  const resolved = new Set<string>();

  for (const pollName of pollLinkedNames) {
    const match = indexStorageNames.find((name) =>
      galleryStorageNameInSet(pollName, new Set([name]))
    );

    resolved.add(match ?? pollName);
  }

  return [...resolved].sort((a, b) => a.localeCompare(b));
}
