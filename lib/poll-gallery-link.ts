import {
  createGalleryMediaRecord,
  listGalleryMediaIndexNameSet,
  listGalleryStorageFileNameSet
} from "@/lib/gallery-media";
import { galleryStorageNameInSet } from "@/lib/gallery-storage-match";
import {
  buildPollGalleryImageUrl,
  normalizePollImageUrlForSave,
  resolvePollGalleryStorageName
} from "@/lib/poll-gallery-link-core";
import { loadAllPollIdImageUrlRows, loadAllPollImageUrlRows } from "@/lib/poll-rows-pagination";
import { mapPollRowWithCategory } from "@/lib/poll-category-store";
import { POLL_GALLERY_LINK_SELECT } from "@/lib/poll-select";
import { createAdminClient } from "@/lib/supabase-admin";

export {
  buildPollGalleryImageUrl,
  normalizePollImageUrlForSave,
  pollHasGalleryImageLink,
  resolvePollGalleryStorageName
} from "@/lib/poll-gallery-link-core";

export async function ensureGalleryMediaIndexedForPollLink(storageName: string): Promise<void> {
  const normalizedName = storageName.trim().replace(/^\/+/, "");

  if (!normalizedName) {
    return;
  }

  await createGalleryMediaRecord(normalizedName);
}

export type SyncPollGalleryImageLinksResult = {
  scanned: number;
  updated: number;
  linked: number;
  storageNames: string[];
};

/** Canonicalize legacy poll image URLs and index gallery_media for filter parity. */
export async function syncPollGalleryImageLinks(): Promise<SyncPollGalleryImageLinksResult> {
  const supabase = createAdminClient();
  const rows = await loadAllPollIdImageUrlRows();
  const names = new Set<string>();
  let updated = 0;

  for (const row of rows) {
    const { image_url: canonicalUrl, storageName } = normalizePollImageUrlForSave(row.image_url);

    if (!storageName) {
      continue;
    }

    names.add(storageName);

    if (canonicalUrl && canonicalUrl !== String(row.image_url ?? "").trim()) {
      const { error: updateError } = await supabase
        .from("polls")
        .update({ image_url: canonicalUrl })
        .eq("id", row.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      updated += 1;
    }
  }

  const storageNames = [...names].sort((a, b) => a.localeCompare(b));

  await Promise.all(storageNames.map((storageName) => ensureGalleryMediaIndexedForPollLink(storageName)));

  const indexNames = await listGalleryMediaIndexNameSet();
  const linkedInIndex = storageNames.filter((name) => galleryStorageNameInSet(name, indexNames));

  return {
    scanned: rows.length,
    updated,
    linked: linkedInIndex.length,
    storageNames: linkedInIndex
  };
}

export type GalleryExistenceNameSets = {
  indexNames: Set<string>;
  storageNames: Set<string>;
};

export async function loadGalleryExistenceNameSets(): Promise<GalleryExistenceNameSets> {
  const [indexNames, storageNames] = await Promise.all([
    listGalleryMediaIndexNameSet(),
    listGalleryStorageFileNameSet()
  ]);

  return { indexNames, storageNames };
}

/** True when image_url points at a gallery file present in the media index or Storage bucket. */
export function pollHasGalleryFileInStorageWithSets(
  imageUrl: string | null | undefined,
  sets: GalleryExistenceNameSets
): boolean {
  const storageName = resolvePollGalleryStorageName(String(imageUrl ?? ""));

  if (!storageName) {
    return false;
  }

  return (
    galleryStorageNameInSet(storageName, sets.indexNames) ||
    galleryStorageNameInSet(storageName, sets.storageNames)
  );
}

/** True when image_url points at a gallery file present in the media index or Storage bucket. */
export async function pollHasGalleryFileInStorage(
  imageUrl: string | null | undefined,
  existence?: GalleryExistenceNameSets
): Promise<boolean> {
  const sets = existence ?? (await loadGalleryExistenceNameSets());
  return pollHasGalleryFileInStorageWithSets(imageUrl, sets);
}

/** Every gallery `storage_name` referenced by a poll `image_url` (no Storage/index pre-filter). */
export async function loadGalleryStorageNamesReferencedByPolls(): Promise<string[]> {
  const rows = await loadAllPollImageUrlRows();
  const names = new Set<string>();

  for (const row of rows) {
    const storageName = resolvePollGalleryStorageName(String(row.image_url ?? ""));

    if (storageName) {
      names.add(storageName);
    }
  }

  const storageNames = [...names].sort((a, b) => a.localeCompare(b));

  await Promise.all(storageNames.map((storageName) => ensureGalleryMediaIndexedForPollLink(storageName)));

  return storageNames;
}

export async function linkPollToGalleryStorage(
  pollId: string,
  storageName: string
): Promise<{ id: string; category: string | null; question: string; image_url: string }> {
  const normalizedName = storageName.trim().replace(/^\/+/, "");
  const imageUrl = buildPollGalleryImageUrl(normalizedName);

  if (!pollId || !normalizedName || !imageUrl) {
    throw new Error("Poll id and gallery file name are required.");
  }

  await ensureGalleryMediaIndexedForPollLink(normalizedName);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("polls")
    .update({ image_url: imageUrl })
    .eq("id", pollId)
    .select(POLL_GALLERY_LINK_SELECT)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Poll not found.");
  }

  return mapPollRowWithCategory(data);
}

export async function applyPollGalleryImageUrlOnSave(imageUrl: unknown): Promise<string> {
  const { image_url: normalizedUrl, storageName } = normalizePollImageUrlForSave(imageUrl);

  if (storageName) {
    await ensureGalleryMediaIndexedForPollLink(storageName);
  }

  return normalizedUrl;
}
