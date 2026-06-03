import path from "node:path";
import type { AdminMediaItem } from "@/lib/admin-media-shared";
import { getMediaKind } from "@/lib/admin-media-shared";
import { galleryBadgeFlagForMediaType } from "@/lib/gallery-media-badge-type";
import { normalizeGalleryMediaAspect, type GalleryMediaAspect } from "@/lib/gallery-media-aspect";
import {
  fetchGalleryMediaRecordByName,
  galleryMetadataMigrationHint,
  selectGalleryMediaRecords
} from "@/lib/gallery-media-db";
import { normalizeGalleryMediaCategory } from "@/lib/gallery-media-category";
import {
  defaultGalleryMediaMetadata,
  GALLERY_MEDIA_RECORD_SELECT_FULL,
  isMissingGalleryMediaColumnError,
  normalizeGalleryMediaRecordRow,
  type GalleryMediaRecordRow
} from "@/lib/gallery-media-record";
import { normalizeGalleryMediaType } from "@/lib/gallery-media-type";
import { createAdminClient } from "@/lib/supabase-admin";

export type GalleryMediaRecord = {
  storage_name: string;
  badge: boolean;
  media_category: string;
  media_type: string;
  aspect: GalleryMediaAspect;
  created_at?: string;
  updated_at: string;
};

export type GalleryMediaMetadataPatch = {
  badge?: boolean;
  media_category?: string;
  media_type?: string;
  aspect?: GalleryMediaAspect;
};

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
    return text.slice(markerIndex + galleryMarker.length).split("?")[0]?.split("#")[0] ?? "";
  }

  if (text.startsWith("gallery/")) {
    return text.slice("gallery/".length).split("?")[0]?.split("#")[0] ?? "";
  }

  return text.split("/").filter(Boolean).pop()?.split("?")[0]?.split("#")[0] ?? "";
}

export function mergeGalleryMediaBadges(
  items: AdminMediaItem[],
  records: GalleryMediaRecord[]
): AdminMediaItem[] {
  const recordByStorageName = new Map(records.map((record) => [record.storage_name, record]));

  return items.map((item) => {
    const storageName = getGalleryStorageName(item.path);
    const record = recordByStorageName.get(storageName);
    const defaults = defaultGalleryMediaMetadata();

    return {
      ...item,
      storageName,
      badge: record?.badge ?? false,
      mediaCategory: record?.media_category ?? defaults.media_category,
      mediaType: record?.media_type ?? defaults.media_type,
      aspect: record?.aspect ?? defaults.aspect
    };
  });
}

const GALLERY_STORAGE_LIST_PAGE_SIZE = 1000;

export async function syncGalleryStorageIndex(): Promise<number> {
  const supabase = createAdminClient();
  let offset = 0;
  let synced = 0;

  while (true) {
    const { data, error } = await supabase.storage.from("gallery").list("", {
      limit: GALLERY_STORAGE_LIST_PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" }
    });

    if (error) {
      throw error;
    }

    const page = data ?? [];
    const files = page.filter(
      (item) => item.name !== ".emptyFolderPlaceholder" && getMediaKind(path.extname(item.name).toLowerCase())
    );

    if (files.length > 0) {
      await Promise.all(files.map((file) => createGalleryMediaRecord(file.name, { badge: false })));
      synced += files.length;
    }

    if (page.length < GALLERY_STORAGE_LIST_PAGE_SIZE) {
      break;
    }

    offset += page.length;
  }

  return synced;
}

export async function listGalleryStorageMedia(): Promise<AdminMediaItem[]> {
  const supabase = createAdminClient();
  const items: AdminMediaItem[] = [];
  let offset = 0;
  const defaults = defaultGalleryMediaMetadata();

  while (true) {
    const { data, error } = await supabase.storage.from("gallery").list("", {
      limit: GALLERY_STORAGE_LIST_PAGE_SIZE,
      offset,
      sortBy: { column: "created_at", order: "desc" }
    });

    if (error) {
      throw error;
    }

    const page = data ?? [];

    for (const item of page) {
      if (item.name === ".emptyFolderPlaceholder") {
        continue;
      }

      const extension = path.extname(item.name).toLowerCase();
      const kind = getMediaKind(extension);

      if (!kind) {
        continue;
      }

      const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(item.name);

      items.push({
        name: item.name,
        path: urlData.publicUrl,
        directory: "gallery",
        kind,
        extension,
        storageName: item.name,
        badge: false,
        mediaCategory: defaults.media_category,
        mediaType: defaults.media_type,
        aspect: defaults.aspect
      });
    }

    if (page.length < GALLERY_STORAGE_LIST_PAGE_SIZE) {
      break;
    }

    offset += page.length;
  }

  return items;
}

export async function loadGalleryMediaRecords(): Promise<GalleryMediaRecord[]> {
  const supabase = createAdminClient();
  const { records } = await selectGalleryMediaRecords(supabase);
  return records;
}

export async function listGalleryMediaLibrary(): Promise<AdminMediaItem[]> {
  const [storageMedia, records] = await Promise.all([listGalleryStorageMedia(), loadGalleryMediaRecords()]);
  return mergeGalleryMediaBadges(storageMedia, records);
}

export async function updateGalleryMediaMetadata(
  storageName: string,
  patch: GalleryMediaMetadataPatch
): Promise<GalleryMediaRecord> {
  const normalizedName = storageName.trim();

  if (!normalizedName) {
    throw new Error("A gallery file name is required.");
  }

  const supabase = createAdminClient();
  const existing = await fetchGalleryMediaRecordByName(supabase, normalizedName);

  const mediaType = normalizeGalleryMediaType(
    patch.media_type !== undefined ? patch.media_type : existing?.media_type
  );
  let badge = patch.badge ?? existing?.badge ?? false;

  if (patch.media_type !== undefined) {
    const badgeFromType = galleryBadgeFlagForMediaType(mediaType);

    if (badgeFromType !== undefined) {
      badge = badgeFromType;
    }
  }

  const record = {
    storage_name: normalizedName,
    badge,
    media_category: normalizeGalleryMediaCategory(
      patch.media_category !== undefined ? patch.media_category : existing?.media_category
    ),
    media_type: mediaType,
    aspect: normalizeGalleryMediaAspect(patch.aspect !== undefined ? patch.aspect : existing?.aspect),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("gallery_media")
    .upsert(record, { onConflict: "storage_name" })
    .select(GALLERY_MEDIA_RECORD_SELECT_FULL)
    .single();

  if (error) {
    if (isMissingGalleryMediaColumnError(error.message)) {
      throw new Error(galleryMetadataMigrationHint());
    }

    throw new Error(error.message ?? "Gallery media could not be updated.");
  }

  if (!data) {
    throw new Error("Gallery media could not be updated.");
  }

  return normalizeGalleryMediaRecordRow(data as GalleryMediaRecordRow);
}

export async function setGalleryMediaBadge(storageName: string, badge: boolean): Promise<GalleryMediaRecord> {
  return updateGalleryMediaMetadata(storageName, { badge });
}

export async function createGalleryMediaRecord(
  storageName: string,
  options: {
    badge?: boolean;
    media_category?: string;
    media_type?: string;
    aspect?: GalleryMediaAspect;
  } = {}
): Promise<void> {
  const normalizedName = storageName.trim();

  if (!normalizedName) {
    return;
  }

  const defaults = defaultGalleryMediaMetadata();
  const supabase = createAdminClient();
  const payload = {
    storage_name: normalizedName,
    badge: options.badge ?? false,
    media_category: normalizeGalleryMediaCategory(options.media_category ?? defaults.media_category),
    media_type: normalizeGalleryMediaType(options.media_type ?? defaults.media_type),
    aspect: normalizeGalleryMediaAspect(options.aspect ?? defaults.aspect),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from("gallery_media").upsert(payload, {
    onConflict: "storage_name",
    ignoreDuplicates: true
  });

  if (error && isMissingGalleryMediaColumnError(error.message)) {
    const { error: legacyError } = await supabase.from("gallery_media").upsert(
      {
        storage_name: normalizedName,
        badge: options.badge ?? false,
        updated_at: payload.updated_at
      },
      { onConflict: "storage_name", ignoreDuplicates: true }
    );

    if (legacyError) {
      throw legacyError;
    }

    return;
  }

  if (error) {
    throw error;
  }
}

export async function deleteGalleryMediaFile(storageName: string): Promise<void> {
  const normalizedName = storageName.trim();

  if (!normalizedName) {
    throw new Error("A gallery file name is required.");
  }

  const supabase = createAdminClient();
  const { error: storageError } = await supabase.storage.from("gallery").remove([normalizedName]);

  if (storageError) {
    throw new Error(storageError.message ?? "Gallery file could not be deleted from storage.");
  }

  const { error: dbError } = await supabase
    .from("gallery_media")
    .delete()
    .eq("storage_name", normalizedName);

  if (dbError) {
    throw new Error(dbError.message ?? "Gallery media record could not be deleted.");
  }
}

export async function deleteGalleryMediaFiles(
  storageNames: string[]
): Promise<{ deleted: number; failures: string[] }> {
  const uniqueNames = [
    ...new Set(storageNames.map((name) => name.trim()).filter((name) => name.length > 0))
  ];

  if (uniqueNames.length === 0) {
    throw new Error("At least one gallery file name is required.");
  }

  let deleted = 0;
  const failures: string[] = [];

  for (const storageName of uniqueNames) {
    try {
      await deleteGalleryMediaFile(storageName);
      deleted += 1;
    } catch (error) {
      failures.push(`${storageName}: ${error instanceof Error ? error.message : "Delete failed."}`);
    }
  }

  if (deleted === 0) {
    throw new Error(failures[0] ?? "No gallery media could be deleted.");
  }

  return { deleted, failures };
}
