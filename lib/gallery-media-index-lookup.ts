import { createAdminClient } from "@/lib/supabase-admin";

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
    const { data, error } = await supabase
      .from("gallery_media")
      .select("storage_name")
      .in("storage_name", chunk);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of data ?? []) {
      const storageName = String(row.storage_name ?? "").trim();

      if (storageName) {
        found.add(storageName);
      }
    }
  }

  return [...found];
}
