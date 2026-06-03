import { createAdminClient } from "@/lib/supabase-admin";
import {
  GALLERY_MEDIA_RECORD_SELECT_FULL,
  GALLERY_MEDIA_RECORD_SELECT_LEGACY,
  isMissingGalleryMediaColumnError,
  normalizeGalleryMediaRecordRow,
  type GalleryMediaRecordRow
} from "@/lib/gallery-media-record";

const GALLERY_MEDIA_IN_CHUNK_SIZE = 100;

function chunkStorageNames(storageNames: string[]): string[][] {
  const chunks: string[][] = [];

  for (let index = 0; index < storageNames.length; index += GALLERY_MEDIA_IN_CHUNK_SIZE) {
    chunks.push(storageNames.slice(index, index + GALLERY_MEDIA_IN_CHUNK_SIZE));
  }

  return chunks;
}

/** Fetch `storage_name` values from `gallery_media` for poll-linked files (chunked `.in()` queries). */
export async function loadGalleryMediaIndexStorageNamesForNames(
  storageNames: string[]
): Promise<string[]> {
  const uniqueNames = [...new Set(storageNames.map((name) => name.trim()).filter(Boolean))];

  if (uniqueNames.length === 0) {
    return [];
  }

  const supabase = createAdminClient();
  const found = new Set<string>();

  for (const chunk of chunkStorageNames(uniqueNames)) {
    let result = await supabase
      .from("gallery_media")
      .select(GALLERY_MEDIA_RECORD_SELECT_FULL)
      .in("storage_name", chunk);

    if (result.error && isMissingGalleryMediaColumnError(result.error.message)) {
      result = await supabase
        .from("gallery_media")
        .select(GALLERY_MEDIA_RECORD_SELECT_LEGACY)
        .in("storage_name", chunk);
    }

    if (result.error) {
      throw new Error(result.error.message);
    }

    for (const row of (result.data as GalleryMediaRecordRow[] | null) ?? []) {
      const normalized = normalizeGalleryMediaRecordRow(row);
      found.add(normalized.storage_name);
    }
  }

  return [...found];
}
