import path from "node:path";
import type { AdminMediaItem } from "@/lib/admin-media-shared";
import { getMediaKind } from "@/lib/admin-media-shared";
import { createAdminClient } from "@/lib/supabase-admin";

export type GalleryMediaRecord = {
  storage_name: string;
  badge: boolean;
  created_at?: string;
  updated_at: string;
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
  const badgeByStorageName = new Map(records.map((record) => [record.storage_name, record.badge]));

  return items.map((item) => {
    const storageName = getGalleryStorageName(item.path);

    return {
      ...item,
      storageName,
      badge: badgeByStorageName.get(storageName) ?? false
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
      await Promise.all(files.map((file) => createGalleryMediaRecord(file.name, false)));
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
        badge: false
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
  const { data, error } = await supabase
    .from("gallery_media")
    .select("storage_name, badge, created_at, updated_at");

  if (error) {
    throw error;
  }

  return (data ?? []) as GalleryMediaRecord[];
}

export async function listGalleryMediaLibrary(): Promise<AdminMediaItem[]> {
  const [storageMedia, records] = await Promise.all([listGalleryStorageMedia(), loadGalleryMediaRecords()]);
  return mergeGalleryMediaBadges(storageMedia, records);
}

export async function setGalleryMediaBadge(storageName: string, badge: boolean): Promise<GalleryMediaRecord> {
  const normalizedName = storageName.trim();

  if (!normalizedName) {
    throw new Error("A gallery file name is required.");
  }

  const supabase = createAdminClient();
  const updatedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("gallery_media")
    .upsert(
      {
        storage_name: normalizedName,
        badge,
        updated_at: updatedAt
      },
      { onConflict: "storage_name" }
    )
    .select("storage_name, badge, updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Gallery media could not be updated.");
  }

  return data as GalleryMediaRecord;
}

export async function createGalleryMediaRecord(storageName: string, badge = false): Promise<void> {
  const normalizedName = storageName.trim();

  if (!normalizedName) {
    return;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("gallery_media").upsert(
    {
      storage_name: normalizedName,
      badge,
      updated_at: new Date().toISOString()
    },
    { onConflict: "storage_name", ignoreDuplicates: true }
  );

  if (error) {
    throw error;
  }
}
