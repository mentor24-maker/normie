"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export type GalleryMarqueeRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type MarqueeSession = {
  pointerId: number;
  startX: number;
  startY: number;
  shiftKey: boolean;
  baseSelection: Set<string>;
};

function isMarqueeBlockedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target.closest("button, a, select, textarea, .admin-gallery-popup-wrap")) {
    return true;
  }

  if (target.closest('input[type="checkbox"], input[type="file"]')) {
    return true;
  }

  if (target instanceof HTMLVideoElement || target.closest("video")) {
    return true;
  }

  return false;
}

function normalizeMarqueeRect(startX: number, startY: number, endX: number, endY: number): GalleryMarqueeRect {
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  return { left, top, width, height };
}

function marqueeHitsCards(grid: HTMLElement, rect: GalleryMarqueeRect): Set<string> {
  const hits = new Set<string>();
  const selection = {
    left: rect.left,
    top: rect.top,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height
  };

  const cards = grid.querySelectorAll<HTMLElement>("[data-gallery-storage-name]");

  for (const card of cards) {
    const bounds = card.getBoundingClientRect();

    if (
      bounds.right >= selection.left &&
      bounds.left <= selection.right &&
      bounds.bottom >= selection.top &&
      bounds.top <= selection.bottom
    ) {
      const storageName = card.dataset.galleryStorageName?.trim();

      if (storageName) {
        hits.add(storageName);
      }
    }
  }

  return hits;
}

function mergeMarqueeSelection(
  baseSelection: Set<string>,
  hits: Set<string>,
  shiftKey: boolean
): Set<string> {
  if (shiftKey) {
    return new Set([...baseSelection, ...hits]);
  }

  return new Set(hits);
}

const MARQUEE_DRAG_THRESHOLD_PX = 4;

export function useGalleryMarqueeSelection(options: {
  enabled: boolean;
  selectedStorageNames: Set<string>;
  onSelectionChange: (next: Set<string>) => void;
  onSelectionBegin?: () => void;
}) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<MarqueeSession | null>(null);
  const optionsRef = useRef(options);
  const [marqueeRect, setMarqueeRect] = useState<GalleryMarqueeRect | null>(null);
  const [previewStorageNames, setPreviewStorageNames] = useState<Set<string>>(() => new Set());
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const finishMarquee = useCallback((endX: number, endY: number) => {
    const session = sessionRef.current;
    const grid = gridRef.current;

    sessionRef.current = null;
    setMarqueeRect(null);
    setPreviewStorageNames(new Set());
    setIsDragging(false);

    if (grid?.hasPointerCapture?.(session?.pointerId ?? -1)) {
      grid.releasePointerCapture(session?.pointerId ?? -1);
    }

    if (!session || !grid) {
      return;
    }

    const rect = normalizeMarqueeRect(session.startX, session.startY, endX, endY);

    if (rect.width < MARQUEE_DRAG_THRESHOLD_PX && rect.height < MARQUEE_DRAG_THRESHOLD_PX) {
      return;
    }

    const hits = marqueeHitsCards(grid, rect);
    const next = mergeMarqueeSelection(session.baseSelection, hits, session.shiftKey);

    if (next.size > 0) {
      optionsRef.current.onSelectionBegin?.();
    }

    optionsRef.current.onSelectionChange(next);
  }, []);

  const updateMarquee = useCallback((clientX: number, clientY: number) => {
    const session = sessionRef.current;
    const grid = gridRef.current;

    if (!session || !grid) {
      return;
    }

    const rect = normalizeMarqueeRect(session.startX, session.startY, clientX, clientY);

    if (rect.width < MARQUEE_DRAG_THRESHOLD_PX && rect.height < MARQUEE_DRAG_THRESHOLD_PX) {
      setMarqueeRect(null);
      setPreviewStorageNames(new Set());
      setIsDragging(false);
      return;
    }

    setIsDragging(true);
    setMarqueeRect(rect);
    const hits = marqueeHitsCards(grid, rect);
    setPreviewStorageNames(
      mergeMarqueeSelection(session.baseSelection, hits, session.shiftKey)
    );
  }, []);

  useEffect(() => {
    function handlePointerMove(event: globalThis.PointerEvent) {
      const session = sessionRef.current;

      if (!session || event.pointerId !== session.pointerId) {
        return;
      }

      updateMarquee(event.clientX, event.clientY);
    }

    function handlePointerUp(event: globalThis.PointerEvent) {
      const session = sessionRef.current;

      if (!session || event.pointerId !== session.pointerId) {
        return;
      }

      finishMarquee(event.clientX, event.clientY);
    }

    function handlePointerCancel(event: globalThis.PointerEvent) {
      const session = sessionRef.current;

      if (!session || event.pointerId !== session.pointerId) {
        return;
      }

      const grid = gridRef.current;

      if (grid?.hasPointerCapture?.(session.pointerId)) {
        grid.releasePointerCapture(session.pointerId);
      }

      sessionRef.current = null;
      setMarqueeRect(null);
      setPreviewStorageNames(new Set());
      setIsDragging(false);
    }

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [finishMarquee, updateMarquee]);

  function handleGridPointerDownCapture(event: ReactPointerEvent<HTMLDivElement>) {
    const grid = gridRef.current;

    if (!optionsRef.current.enabled || event.button !== 0 || !grid) {
      return;
    }

    if (!(event.target instanceof Node) || !grid.contains(event.target)) {
      return;
    }

    if (isMarqueeBlockedTarget(event.target)) {
      return;
    }

    event.preventDefault();
    grid.setPointerCapture(event.pointerId);

    sessionRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      shiftKey: event.shiftKey,
      baseSelection: event.shiftKey
        ? new Set(optionsRef.current.selectedStorageNames)
        : new Set()
    };

    setMarqueeRect(null);
    setPreviewStorageNames(new Set());
    setIsDragging(false);
  }

  return {
    gridRef,
    marqueeRect,
    previewStorageNames,
    isDragging,
    handleGridPointerDownCapture
  };
}
