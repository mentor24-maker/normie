"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * True after hydration, false during SSR and the initial client render.
 * Replaces the `setMounted(true)`-in-effect pattern flagged by
 * react-hooks/set-state-in-effect.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

/**
 * Read a browser-only value (localStorage flag, window.location, ...)
 * without a setState-in-effect cascade. `read` runs on the client;
 * `serverValue` is used during SSR and hydration.
 *
 * `read` must return a primitive (or otherwise Object.is-stable) value —
 * returning a fresh object/array on every call would loop the store.
 */
export function useClientValue<T extends string | number | boolean | null>(
  read: () => T,
  serverValue: T
): T {
  return useSyncExternalStore(emptySubscribe, read, () => serverValue);
}
