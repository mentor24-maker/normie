"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_GALLERY_MEDIA_FILTERS,
  galleryFiltersToQueryParams,
  type GalleryMediaFilters
} from "@/lib/gallery-media-filters";
import { readAdminJson } from "@/lib/admin-fetch";
import type { AdminMediaItem } from "@/lib/admin-media-shared";
import { buildGalleryMediaSearchParams } from "@/lib/gallery-media-query-params";

type GalleryMediaListResponse = {
  media?: AdminMediaItem[];
  total?: number;
  limit?: number;
  offset?: number;
  error?: string;
};

export function useGalleryMediaLibrary(options?: {
  enabled?: boolean;
  syncOnFirstLoad?: boolean;
  /** When set (e.g. bulk edit), list queries use these filters instead of live category/type/aspect. */
  listQueryFilters?: GalleryMediaFilters | null;
}) {
  const enabled = options?.enabled ?? true;
  const [media, setMedia] = useState<AdminMediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<GalleryMediaFilters>(DEFAULT_GALLERY_MEDIA_FILTERS);
  const [debouncedFilename, setDebouncedFilename] = useState("");
  const mediaRef = useRef<AdminMediaItem[]>([]);
  const hasSyncedIndexRef = useRef(false);

  mediaRef.current = media;

  const loadMedia = useCallback(
    async (loadOptions?: { sync?: boolean; append?: boolean }) => {
      if (!enabled) {
        return;
      }

      const querySource = options?.listQueryFilters ?? filters;
      const activeFilters: GalleryMediaFilters = {
        filename: options?.listQueryFilters ? querySource.filename : debouncedFilename,
        extension: querySource.extension,
        kind: querySource.kind,
        mediaCategory: querySource.mediaCategory,
        mediaType: querySource.mediaType,
        aspect: querySource.aspect,
        sort: querySource.sort,
        not: querySource.not
      };
      const offset = loadOptions?.append ? mediaRef.current.length : 0;
      const query = galleryFiltersToQueryParams(activeFilters, { offset });
      const search = buildGalleryMediaSearchParams(query, { sync: loadOptions?.sync });

      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await fetch(`/api/admin/media?${search.toString()}`, {
          cache: "no-store"
        });

        const data = await readAdminJson<GalleryMediaListResponse>(response, "Failed to load media library.");

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load media library.");
        }

        const nextMedia = data.media ?? [];
        setMedia(loadOptions?.append ? (current) => [...current, ...nextMedia] : nextMedia);
        setTotal(data.total ?? nextMedia.length);
      } catch (loadError) {
        setLoadError(loadError instanceof Error ? loadError.message : "Failed to load media library.");
        if (!loadOptions?.append) {
          setMedia([]);
          setTotal(0);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      debouncedFilename,
      enabled,
      filters.aspect,
      filters.extension,
      filters.kind,
      filters.mediaCategory,
      filters.mediaType,
      filters.sort,
      filters.not,
      options?.listQueryFilters
    ]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedFilename(filters.filename);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [filters.filename]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const shouldSync = options?.syncOnFirstLoad && !hasSyncedIndexRef.current;
    hasSyncedIndexRef.current = true;
    void loadMedia({ sync: shouldSync });
  }, [
    debouncedFilename,
    enabled,
    filters.aspect,
    filters.extension,
    filters.kind,
    filters.mediaCategory,
    filters.mediaType,
    filters.sort,
    filters.not,
    loadMedia,
    options?.listQueryFilters,
    options?.syncOnFirstLoad
  ]);

  function clearFilters() {
    setFilters(DEFAULT_GALLERY_MEDIA_FILTERS);
    setDebouncedFilename("");
  }

  const rangeStart = total === 0 ? 0 : 1;
  const rangeEnd = media.length;
  const canLoadMore = media.length < total;

  return {
    media,
    total,
    isLoading,
    filters,
    debouncedFilename,
    setFilters,
    loadMedia,
    clearFilters,
    rangeStart,
    rangeEnd,
    canLoadMore,
    loadError
  };
}
