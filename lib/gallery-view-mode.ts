"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Gallery vs List layout choice, shared by every gallery surface (admin library,
 * builder picker, blog picker) and remembered across visits — picking List in the
 * builder picker keeps List in the admin library too.
 */

export const GALLERY_VIEW_MODES = ["gallery", "list"] as const;

export type GalleryViewMode = (typeof GALLERY_VIEW_MODES)[number];

export const DEFAULT_GALLERY_VIEW_MODE: GalleryViewMode = "gallery";

const STORAGE_KEY = "normie:gallery-view-mode";

const listeners = new Set<() => void>();

let currentMode: GalleryViewMode | null = null;

function readStoredMode(): GalleryViewMode {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "list" ? "list" : DEFAULT_GALLERY_VIEW_MODE;
  } catch {
    return DEFAULT_GALLERY_VIEW_MODE;
  }
}

function getSnapshot(): GalleryViewMode {
  if (currentMode === null) {
    currentMode = readStoredMode();
  }

  return currentMode;
}

function getServerSnapshot(): GalleryViewMode {
  return DEFAULT_GALLERY_VIEW_MODE;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function setGalleryViewMode(mode: GalleryViewMode): void {
  if (getSnapshot() === mode) {
    return;
  }

  currentMode = mode;

  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // A blocked localStorage still gets the in-memory switch; it just won't persist.
  }

  for (const listener of listeners) {
    listener();
  }
}

export function useGalleryViewMode(): [GalleryViewMode, (mode: GalleryViewMode) => void] {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setMode = useCallback((next: GalleryViewMode) => setGalleryViewMode(next), []);

  return [mode, setMode];
}
