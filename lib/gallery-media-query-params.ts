import type { AdminMediaKind, AdminMediaItem } from "@/lib/admin-media-shared";
import { GALLERY_FILTER_EXTENSIONS } from "@/lib/admin-media-shared";

export const GALLERY_MEDIA_PAGE_SIZE_DEFAULT = 48;
export const GALLERY_MEDIA_PAGE_SIZE_MAX = 200;

export const GALLERY_MEDIA_SORT_OPTIONS = [
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" }
] as const;

export type GalleryMediaSort = (typeof GALLERY_MEDIA_SORT_OPTIONS)[number]["value"];

export type GalleryMediaBadgeFilter = "" | "yes" | "no";
export type GalleryMediaKindFilter = "" | AdminMediaKind;

export type GalleryMediaQueryParams = {
  filename: string;
  extension: string;
  kind: GalleryMediaKindFilter;
  badge: GalleryMediaBadgeFilter;
  sort: GalleryMediaSort;
  limit: number;
  offset: number;
  sync: boolean;
  indexed: boolean;
};

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
  const sort = GALLERY_MEDIA_SORT_OPTIONS.some((option) => option.value === sortParam)
    ? (sortParam as GalleryMediaSort)
    : "name_asc";

  const kindParam = searchParams.get("kind")?.trim() ?? "";
  const kind: GalleryMediaKindFilter = kindParam === "image" || kindParam === "video" ? kindParam : "";

  const badgeParam = searchParams.get("badge")?.trim().toLowerCase() ?? "";
  const badge: GalleryMediaBadgeFilter =
    badgeParam === "yes" || badgeParam === "no" ? badgeParam : "";

  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), GALLERY_MEDIA_PAGE_SIZE_MAX)
    : GALLERY_MEDIA_PAGE_SIZE_DEFAULT;
  const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0;

  return {
    filename: searchParams.get("filename")?.trim() ?? "",
    extension: normalizeGalleryExtensionFilter(searchParams.get("extension") ?? ""),
    kind,
    badge,
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
