import {
  GALLERY_IMAGE_EXTENSIONS,
  GALLERY_VIDEO_EXTENSIONS,
  getMediaKind
} from "@/lib/admin-media-shared";
import type { AdminMediaItem } from "@/lib/admin-media-shared";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  GALLERY_MEDIA_RECORD_SELECT_FULL,
  GALLERY_MEDIA_RECORD_SELECT_LEGACY,
  isMissingGalleryMediaColumnError,
  normalizeGalleryMediaRecordRow,
  type GalleryMediaRecordRow
} from "@/lib/gallery-media-record";
import type { GalleryMediaRecord } from "@/lib/gallery-media";
import { loadGalleryMediaIndexStorageNamesForNames } from "@/lib/gallery-media-index-lookup";
import { listGalleryMediaLinkedToPolls } from "@/lib/gallery-poll-linked-media";
import { resolveGalleryIndexStorageNamesForPollLinks } from "@/lib/gallery-storage-match";
import { loadGalleryStorageNamesReferencedByPolls } from "@/lib/poll-gallery-link";
import {
  escapeIlikePattern,
  GALLERY_MEDIA_METADATA_SORTS,
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
  GALLERY_MEDIA_SORT_VALUES,
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
    mediaCategory: row.media_category,
    mediaType: row.media_type,
    aspect: row.aspect,
    createdAt: row.created_at
  };
}

async function executeGalleryMediaQuery(
  params: GalleryMediaQueryParams,
  selectColumns: string,
  pollLinkedStorageNames?: string[]
) {
  const supabase = createAdminClient();
  let query = supabase.from("gallery_media").select(selectColumns, { count: "exact" });

  if (pollLinkedStorageNames) {
    query = query.in("storage_name", pollLinkedStorageNames);
  }

  const filename = params.filename.trim();

  if (filename) {
    const pattern = `%${escapeIlikePattern(filename)}%`;

    query = params.notFilename
      ? query.not("storage_name", "ilike", pattern)
      : query.ilike("storage_name", pattern);
  }

  const extension = params.extension;

  if (extension) {
    const pattern = `%${extension}`;

    query = params.notExtension
      ? query.not("storage_name", "ilike", pattern)
      : query.ilike("storage_name", pattern);
  }

  if (params.kind === "image" || params.kind === "video") {
    const pattern = kindStorageNamePattern(params.kind);

    query = params.notKind
      ? query.not("storage_name", "imatch", pattern)
      : query.filter("storage_name", "imatch", pattern);
  }

  if (params.badge === "yes") {
    query = query.eq("badge", true);
  } else if (params.badge === "no") {
    query = query.eq("badge", false);
  }

  if (params.mediaCategory) {
    query = params.notMediaCategory
      ? query.neq("media_category", params.mediaCategory)
      : query.eq("media_category", params.mediaCategory);
  }

  if (params.mediaType) {
    query = params.notMediaType
      ? query.neq("media_type", params.mediaType)
      : query.eq("media_type", params.mediaType);
  }

  if (params.aspect) {
    query = params.notAspect
      ? query.neq("aspect", params.aspect)
      : query.eq("aspect", params.aspect);
  }

  // The legacy select runs against databases that predate the metadata columns,
  // so ordering by them there would fail the same way the select just did.
  const metadataSort =
    selectColumns === GALLERY_MEDIA_RECORD_SELECT_FULL
      ? GALLERY_MEDIA_METADATA_SORTS[params.sort]
      : undefined;

  if (metadataSort) {
    query = query
      .order(metadataSort.column, { ascending: metadataSort.ascending, nullsFirst: false })
      .order("storage_name", { ascending: true });
  } else {
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
  }

  const rangeEnd = params.offset + params.limit - 1;
  query = query.range(params.offset, rangeEnd);

  return query;
}

export async function queryGalleryMediaLibrary(
  params: GalleryMediaQueryParams,
  options?: { syncIndex?: () => Promise<number> }
): Promise<GalleryMediaQueryResult> {
  if (params.sync && options?.syncIndex) {
    await options.syncIndex();
  }

  let pollLinkedStorageNames: string[] | undefined;

  if (params.hasPoll === "yes") {
    pollLinkedStorageNames = await loadGalleryStorageNamesReferencedByPolls();

    if (pollLinkedStorageNames.length === 0) {
      return {
        media: [],
        total: 0,
        limit: params.limit,
        offset: params.offset
      };
    }

    const indexStorageNames = resolveGalleryIndexStorageNamesForPollLinks(
      pollLinkedStorageNames,
      await loadGalleryMediaIndexStorageNamesForNames(pollLinkedStorageNames)
    );

    let result = await executeGalleryMediaQuery(
      params,
      GALLERY_MEDIA_RECORD_SELECT_FULL,
      indexStorageNames
    );

    if (result.error && isMissingGalleryMediaColumnError(result.error.message)) {
      result = await executeGalleryMediaQuery(
        params,
        GALLERY_MEDIA_RECORD_SELECT_LEGACY,
        indexStorageNames
      );
    }

    if (!result.error) {
      const supabase = createAdminClient();
      const rows = ((result.data as unknown as GalleryMediaRecordRow[] | null) ?? []).map((row) => {
        const normalized = normalizeGalleryMediaRecordRow(row);

        return {
          ...normalized,
          created_at: row.created_at ?? normalized.created_at ?? new Date(0).toISOString()
        } satisfies GalleryMediaRow;
      });

      const media = rows
        .map((row) => {
          const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(row.storage_name);
          return mapGalleryRowToMediaItem(row, urlData.publicUrl);
        })
        .filter((item): item is AdminMediaItem => Boolean(item));

      if (media.length > 0 || (result.count ?? 0) > 0) {
        return {
          media,
          total: result.count ?? media.length,
          limit: params.limit,
          offset: params.offset
        };
      }
    }

    return listGalleryMediaLinkedToPolls(params, pollLinkedStorageNames);
  }

  let result = await executeGalleryMediaQuery(
    params,
    GALLERY_MEDIA_RECORD_SELECT_FULL,
    pollLinkedStorageNames
  );

  if (result.error && isMissingGalleryMediaColumnError(result.error.message)) {
    result = await executeGalleryMediaQuery(
      params,
      GALLERY_MEDIA_RECORD_SELECT_LEGACY,
      pollLinkedStorageNames
    );
  }

  if (result.error) {
    throw result.error;
  }

  const supabase = createAdminClient();
  const rows = ((result.data as unknown as GalleryMediaRecordRow[] | null) ?? []).map((row) => {
    const normalized = normalizeGalleryMediaRecordRow(row);

    return {
      ...normalized,
      created_at: row.created_at ?? normalized.created_at ?? new Date(0).toISOString()
    } satisfies GalleryMediaRow;
  });

  const media = rows
    .map((row) => {
      const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(row.storage_name);
      return mapGalleryRowToMediaItem(row, urlData.publicUrl);
    })
    .filter((item): item is AdminMediaItem => Boolean(item));

  return {
    media,
    total: result.count ?? media.length,
    limit: params.limit,
    offset: params.offset
  };
}
