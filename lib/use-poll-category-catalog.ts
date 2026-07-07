"use client";

import { useEffect, useState } from "react";
import type { PollCategorySeed } from "@/lib/poll-categories";
import {
  fetchPollCategoryCatalog,
  getCachedPollCategoryCatalog
} from "@/lib/poll-category-catalog-client";

export type PollCategoryCatalogState = {
  catalog: readonly PollCategorySeed[];
  isLoading: boolean;
  error: string | null;
};

export function usePollCategoryCatalog(): PollCategoryCatalogState {
  const [catalog, setCatalog] = useState<readonly PollCategorySeed[]>(() => getCachedPollCategoryCatalog() ?? []);
  const [isLoading, setIsLoading] = useState(() => getCachedPollCategoryCatalog() === null);
  const [error, setError] = useState<string | null>(null);

  // If another instance filled the module cache after our lazy init, adopt
  // it during render instead of a setState-in-effect cascade.
  const cachedNow = getCachedPollCategoryCatalog();

  if (cachedNow && catalog !== cachedNow) {
    setCatalog(cachedNow);
    setIsLoading(false);
    setError(null);
  }

  useEffect(() => {
    if (getCachedPollCategoryCatalog()) {
      return;
    }

    let cancelled = false;

    void fetchPollCategoryCatalog()
      .then((loaded) => {
        if (!cancelled) {
          setCatalog(loaded);
          setError(null);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setCatalog([]);
          setError(loadError instanceof Error ? loadError.message : "Failed to load poll categories.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { catalog, isLoading, error };
}
