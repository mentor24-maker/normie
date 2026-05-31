import {
  GALLERY_IMAGE_EXTENSIONS,
  GALLERY_VIDEO_EXTENSIONS,
  getMediaKind
} from "@/lib/admin-media-shared";
import type { AdminMediaItem } from "@/lib/admin-media-shared";
import { createAdminClient } from "@/lib/supabase-admin";
import type { GalleryMediaRecord } from "@/lib/gallery-media";
import {
  escapeIlikePattern,
  type GalleryMediaQueryParams,
  type GalleryMediaQueryResult
} from "@/lib/gallery-media-query-params";

export const GALLERY_STORAGE_LIST_PAGE_SIZE = 1000;

export type {
  GalleryMediaBadgeFilter,
  GalleryMediaKindFilter,
  GalleryMediaQueryParams,
  GalleryMediaQueryResult,
  GalleryMediaSort
} from "@/lib/gallery-media-query-params";

export {
  GALLERY_MEDIA_PAGE_SIZE_DEFAULT,
  GALLERY_MEDIA_PAGE_SIZE_MAX,
  GALLERY_MEDIA_SORT_OPTIONS,
  buildGalleryMediaSearchParams,
  escapeIlikePattern,
  galleryMediaQueryUsesServerFilters,
  normalizeGalleryExtensionFilter,
  parseGalleryMediaQueryParams
} from "@/lib/gallery-media-query-params";

type GalleryMediaRow = GalleryMediaRecord & {
  created_at: string;
};

function storageFileExtension(storageName: string): string {
  const index = storageName.lastIndexOf(".");

  if (index < 0) {
    return "";
  }

  return storageName.slice(index).toLowerCase();
}

function kindStorageNamePattern(kind: "image" | "video"): string {
  const extensions = kind === "image" ? GALLERY_IMAGE_EXTENSIONS : GALLERY_VIDEO_EXTENSIONS;
  const alternation = extensions
    .map((extension) => extension.slice(1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

  return `\\.(${alternation})$`;
}

function mapGalleryRowToMediaItem(row: GalleryMediaRow, publicPath: string): AdminMediaItem | null {
  const extension = storageFileExtension(row.storage_name);
  const kind = getMediaKind(extension);

  if (!kind) {
    return null;
  }

  return {
    name: row.storage_name,
    path: publicPath,
    directory: "gallery",
    kind,
    extension,
    storageName: row.storage_name,
    badge: row.badge,
    createdAt: row.created_at
  };
}

export async function queryGalleryMediaLibrary(
  params: GalleryMediaQueryParams,
  options?: { syncIndex?: () => Promise<number> }
): Promise<GalleryMediaQueryResult> {
  if (params.sync && options?.syncIndex) {
    await options.syncIndex();
  }

  const supabase = createAdminClient();
  let query = supabase
    .from("gallery_media")
    .select("storage_name, badge, created_at, updated_at", { count: "exact" });

  const filename = params.filename.trim();

  if (filename) {
    query = query.ilike("storage_name", `%${escapeIlikePattern(filename)}%`);
  }

  const extension = params.extension;

  if (extension) {
    query = query.ilike("storage_name", `%${extension}`);
  }

  if (params.kind === "image" || params.kind === "video") {
    query = query.filter("storage_name", "imatch", kindStorageNamePattern(params.kind));
  }

  if (params.badge === "yes") {
    query = query.eq("badge", true);
  } else if (params.badge === "no") {
    query = query.eq("badge", false);
  }

  switch (params.sort) {
    case "name_desc":
      query = query.order("storage_name", { ascending: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false }).order("storage_name", { ascending: true });
      break;
    case "oldest":
      query = query.order("created_at", { ascending: true }).order("storage_name", { ascending: true });
      break;
    default:
      query = query.order("storage_name", { ascending: true });
      break;
  }

  const rangeEnd = params.offset + params.limit - 1;
  query = query.range(params.offset, rangeEnd);

  const { data, count, error } = await query;

  if (error) {
    throw error;
  }

  const rows = (data as GalleryMediaRow[] | null) ?? [];
  const media = rows
    .map((row) => {
      const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(row.storage_name);
      return mapGalleryRowToMediaItem(row, urlData.publicUrl);
    })
    .filter((item): item is AdminMediaItem => Boolean(item));

  return {
    media,
    total: count ?? media.length,
    limit: params.limit,
    offset: params.offset
  };
}
