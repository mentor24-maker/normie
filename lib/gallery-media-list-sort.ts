/**
 * Column sorting for the gallery List view.
 *
 * Normie pages the gallery on the server, so a clicked column head does not
 * reorder the loaded page — it maps to the same `GalleryMediaSort` the filter
 * bar's Sort dropdown uses, and the query re-runs. That keeps the sort spanning
 * the whole library (the first page really is the top of the sort) and keeps the
 * dropdown and the column heads showing one shared truth.
 */

import type { GalleryMediaSort } from "@/lib/gallery-media-query-params";

export const GALLERY_MEDIA_LIST_SORT_KEYS = [
  "name",
  "category",
  "type",
  "aspect",
  "createdAt"
] as const;

export type GalleryMediaListSortKey = (typeof GALLERY_MEDIA_LIST_SORT_KEYS)[number];
export type GalleryMediaListSortDirection = "asc" | "desc";

export type GalleryMediaListSortState = {
  key: GalleryMediaListSortKey;
  direction: GalleryMediaListSortDirection;
};

const COLUMN_SORTS: Record<
  GalleryMediaListSortKey,
  Record<GalleryMediaListSortDirection, GalleryMediaSort>
> = {
  name: { asc: "name_asc", desc: "name_desc" },
  category: { asc: "category_asc", desc: "category_desc" },
  type: { asc: "type_asc", desc: "type_desc" },
  aspect: { asc: "aspect_asc", desc: "aspect_desc" },
  createdAt: { asc: "oldest", desc: "newest" }
};

/** Create Date reads newest-first on the first click; text columns read A–Z. */
const FIRST_CLICK_DIRECTION: Record<GalleryMediaListSortKey, GalleryMediaListSortDirection> = {
  name: "asc",
  category: "asc",
  type: "asc",
  aspect: "asc",
  createdAt: "desc"
};

export function galleryMediaListSortState(sort: GalleryMediaSort): GalleryMediaListSortState | null {
  for (const key of GALLERY_MEDIA_LIST_SORT_KEYS) {
    const directions = COLUMN_SORTS[key];

    if (directions.asc === sort) {
      return { key, direction: "asc" };
    }

    if (directions.desc === sort) {
      return { key, direction: "desc" };
    }
  }

  return null;
}

/** Sort value after clicking `key`: the column's default direction, then flipped. */
export function nextGalleryMediaListSort(
  sort: GalleryMediaSort,
  key: GalleryMediaListSortKey
): GalleryMediaSort {
  const current = galleryMediaListSortState(sort);

  if (current?.key === key) {
    return COLUMN_SORTS[key][current.direction === "asc" ? "desc" : "asc"];
  }

  return COLUMN_SORTS[key][FIRST_CLICK_DIRECTION[key]];
}

export function galleryMediaListAriaSort(
  sort: GalleryMediaSort,
  key: GalleryMediaListSortKey
): "ascending" | "descending" | "none" {
  const current = galleryMediaListSortState(sort);

  if (current?.key !== key) {
    return "none";
  }

  return current.direction === "asc" ? "ascending" : "descending";
}
