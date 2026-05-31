"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_GALLERY_MEDIA_FILTERS,
  type GalleryMediaFilters
} from "@/lib/gallery-media-filters";
import { readAdminJson } from "@/lib/admin-fetch";
import type { AdminMediaItem } from "@/lib/admin-media-shared";
import {
  buildGalleryMediaSearchParams,
  GALLERY_MEDIA_PAGE_SIZE_DEFAULT,
  type GalleryMediaQueryParams
} from "@/lib/gallery-media-query-params";

type GalleryMediaListResponse = {
  media?: AdminMediaItem[];
  total?: number;
  limit?: number;
  offset?: number;
  error?: string;
};

function filtersToQueryParams(filters: GalleryMediaFilters, offset: number): GalleryMediaQueryParams {
  return {
    filename: filters.filename,
    extension: filters.extension,
    kind: filters.kind,
    sort: filters.sort,
    badge: "",
    limit: GALLERY_MEDIA_PAGE_SIZE_DEFAULT,
    offset,
    sync: false,
    indexed: true
  };
}

export function useGalleryMediaLibrary(options?: { enabled?: boolean; syncOnFirstLoad?: boolean }) {
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

      const activeFilters: GalleryMediaFilters = {
        filename: debouncedFilename,
        extension: filters.extension,
        kind: filters.kind,
        sort: filters.sort
      };
      const offset = loadOptions?.append ? mediaRef.current.length : 0;
      const query = filtersToQueryParams(activeFilters, offset);
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
    [debouncedFilename, enabled, filters.extension, filters.kind, filters.sort]
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
    filters.extension,
    filters.kind,
    filters.sort,
    loadMedia,
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
    setFilters,
    loadMedia,
    clearFilters,
    rangeStart,
    rangeEnd,
    canLoadMore,
    loadError
  };
}
