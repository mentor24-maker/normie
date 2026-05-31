import type { GalleryMediaKindFilter, GalleryMediaSort } from "@/lib/gallery-media-query-params";

export type GalleryMediaFilters = {
  filename: string;
  extension: string;
  kind: GalleryMediaKindFilter;
  sort: GalleryMediaSort;
};

export const DEFAULT_GALLERY_MEDIA_FILTERS: GalleryMediaFilters = {
  filename: "",
  extension: "",
  kind: "",
  sort: "name_asc"
};

export function hasActiveGalleryMediaFilters(filters: GalleryMediaFilters): boolean {
  return (
    filters.filename.trim().length > 0 ||
    filters.extension.length > 0 ||
    filters.kind.length > 0 ||
    filters.sort !== DEFAULT_GALLERY_MEDIA_FILTERS.sort
  );
}
