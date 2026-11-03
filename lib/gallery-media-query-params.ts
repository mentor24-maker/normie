import type { AdminMediaKind, AdminMediaItem } from "@/lib/admin-media-shared";
import { GALLERY_FILTER_EXTENSIONS } from "@/lib/admin-media-shared";
import { isGalleryMediaAspect, type GalleryMediaAspect } from "@/lib/gallery-media-aspect";
import { isGalleryMediaType } from "@/lib/gallery-media-type";

export const GALLERY_MEDIA_PAGE_SIZE_DEFAULT = 48;
export const GALLERY_MEDIA_PAGE_SIZE_MAX = 200;

export const GALLERY_MEDIA_SORT_VALUES = [
  "name_asc",
  "name_desc",
  "newest",
  "oldest",
  "category_asc",
  "category_desc",
  "type_asc",
  "type_desc",
  "aspect_asc",
  "aspect_desc"
] as const;

export type GalleryMediaSort = (typeof GALLERY_MEDIA_SORT_VALUES)[number];

/**
 * Sort dropdown choices. Every value is also reachable by clicking the matching
 * column head in the gallery List view, so the two controls stay in sync.
 */
export const GALLERY_MEDIA_SORT_OPTIONS: readonly { value: GalleryMediaSort; label: string }[] = [
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "category_asc", label: "Category A–Z" },
  { value: "category_desc", label: "Category Z–A" },
  { value: "type_asc", label: "Type A–Z" },
  { value: "type_desc", label: "Type Z–A" },
  { value: "aspect_asc", label: "Aspect A–Z" },
  { value: "aspect_desc", label: "Aspect Z–A" }
];

/**
 * Metadata columns the gallery can order by, with the DB column each maps to.
 * `name_*`/`newest`/`oldest` order by `storage_name` / `created_at` instead.
 */
export const GALLERY_MEDIA_METADATA_SORTS: Partial<
  Record<GalleryMediaSort, { column: "media_category" | "media_type" | "aspect"; ascending: boolean }>
> = {
  category_asc: { column: "media_category", ascending: true },
  category_desc: { column: "media_category", ascending: false },
  type_asc: { column: "media_type", ascending: true },
  type_desc: { column: "media_type", ascending: false },
  aspect_asc: { column: "aspect", ascending: true },
  aspect_desc: { column: "aspect", ascending: false }
};

export type GalleryMediaBadgeFilter = "" | "yes" | "no";
export type GalleryMediaPollFilter = "" | "yes";
export type GalleryMediaKindFilter = "" | AdminMediaKind;

export type GalleryMediaQueryParams = {
  filename: string;
  extension: string;
  kind: GalleryMediaKindFilter;
  badge: GalleryMediaBadgeFilter;
  hasPoll: GalleryMediaPollFilter;
  mediaCategory: string;
  mediaType: string;
  aspect: "" | GalleryMediaAspect;
  notFilename: boolean;
  notExtension: boolean;
  notKind: boolean;
  notMediaCategory: boolean;
  notMediaType: boolean;
  notAspect: boolean;
  sort: GalleryMediaSort;
  limit: number;
  offset: number;
  sync: boolean;
  indexed: boolean;
};

function parseNegationFlag(searchParams: URLSearchParams, key: string): boolean {
  const value = searchParams.get(key)?.trim().toLowerCase() ?? "";
  return value === "1" || value === "true" || value === "yes";
}

export type GalleryMediaQueryResult = {
  media: AdminMediaItem[];
  total: number;
  limit: number;
  offset: number;
};

export function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function normalizeGalleryExtensionFilter(value: string): string {
  const trimmed = value.trim().toLowerCase();

  if (!trimmed) {
    return "";
  }

  const withDot = trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
  return GALLERY_FILTER_EXTENSIONS.includes(withDot as (typeof GALLERY_FILTER_EXTENSIONS)[number])
    ? withDot
    : "";
}

export function parseGalleryMediaQueryParams(searchParams: URLSearchParams): GalleryMediaQueryParams {
  const sortParam = searchParams.get("sort")?.trim() ?? "name_asc";
  const sort = (GALLERY_MEDIA_SORT_VALUES as readonly string[]).includes(sortParam)
    ? (sortParam as GalleryMediaSort)
    : "name_asc";

  const kindParam = searchParams.get("kind")?.trim() ?? "";
  const kind: GalleryMediaKindFilter = kindParam === "image" || kindParam === "video" ? kindParam : "";

  const badgeParam = searchParams.get("badge")?.trim().toLowerCase() ?? "";
  const badge: GalleryMediaBadgeFilter =
    badgeParam === "yes" || badgeParam === "no" ? badgeParam : "";

  const hasPollParam = searchParams.get("has_poll")?.trim().toLowerCase() ?? "";
  const hasPoll: GalleryMediaPollFilter = hasPollParam === "yes" ? "yes" : "";

  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), GALLERY_MEDIA_PAGE_SIZE_MAX)
    : GALLERY_MEDIA_PAGE_SIZE_DEFAULT;
  const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0;

  const aspectParam = searchParams.get("aspect")?.trim().toLowerCase() ?? "";
  const aspect: "" | GalleryMediaAspect = isGalleryMediaAspect(aspectParam) ? aspectParam : "";

  const mediaTypeParam = searchParams.get("media_type")?.trim() ?? "";
  const mediaType = isGalleryMediaType(mediaTypeParam) ? mediaTypeParam : "";

  return {
    filename: searchParams.get("filename")?.trim() ?? "",
    extension: normalizeGalleryExtensionFilter(searchParams.get("extension") ?? ""),
    kind,
    badge,
    hasPoll,
    mediaCategory: searchParams.get("media_category")?.trim() ?? "",
    mediaType,
    aspect,
    notFilename: parseNegationFlag(searchParams, "not_filename"),
    notExtension: parseNegationFlag(searchParams, "not_extension"),
    notKind: parseNegationFlag(searchParams, "not_kind"),
    notMediaCategory: parseNegationFlag(searchParams, "not_media_category"),
    notMediaType: parseNegationFlag(searchParams, "not_media_type"),
    notAspect: parseNegationFlag(searchParams, "not_aspect"),
    sort,
    limit,
    offset,
    sync: searchParams.get("sync") === "1",
    indexed: searchParams.get("indexed") === "1"
  };
}

export function galleryMediaQueryUsesServerFilters(params: GalleryMediaQueryParams): boolean {
  return (
    params.indexed ||
    params.filename.length > 0 ||
    params.extension.length > 0 ||
    params.kind.length > 0 ||
    params.badge.length > 0 ||
    params.hasPoll.length > 0 ||
    params.mediaCategory.length > 0 ||
    params.mediaType.length > 0 ||
    params.aspect.length > 0 ||
    params.notFilename ||
    params.notExtension ||
    params.notKind ||
    params.notMediaCategory ||
    params.notMediaType ||
    params.notAspect ||
    params.sort !== "name_asc" ||
    params.offset > 0 ||
    params.limit !== GALLERY_MEDIA_PAGE_SIZE_DEFAULT ||
    params.sync
  );
}

export function buildGalleryMediaSearchParams(
  params: GalleryMediaQueryParams,
  options?: { sync?: boolean }
): URLSearchParams {
  const search = new URLSearchParams();

  if (params.filename) {
    search.set("filename", params.filename);
  }

  if (params.extension) {
    search.set("extension", params.extension);
  }

  if (params.kind) {
    search.set("kind", params.kind);
  }

  if (params.badge) {
    search.set("badge", params.badge);
  }

  if (params.hasPoll) {
    search.set("has_poll", params.hasPoll);
  }

  if (params.mediaCategory) {
    search.set("media_category", params.mediaCategory);
  }

  if (params.mediaType) {
    search.set("media_type", params.mediaType);
  }

  if (params.aspect) {
    search.set("aspect", params.aspect);
  }

  if (params.notFilename) {
    search.set("not_filename", "1");
  }

  if (params.notExtension) {
    search.set("not_extension", "1");
  }

  if (params.notKind) {
    search.set("not_kind", "1");
  }

  if (params.notMediaCategory) {
    search.set("not_media_category", "1");
  }

  if (params.notMediaType) {
    search.set("not_media_type", "1");
  }

  if (params.notAspect) {
    search.set("not_aspect", "1");
  }

  if (params.sort !== "name_asc") {
    search.set("sort", params.sort);
  }

  search.set("limit", String(params.limit));
  search.set("offset", String(params.offset));

  if (options?.sync) {
    search.set("sync", "1");
  }

  if (params.indexed) {
    search.set("indexed", "1");
  }

  return search;
}
