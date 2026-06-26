"use client";

import { useEffect, useState } from "react";
import type { SearchEntry } from "@/lib/search/types";

// The index is fetched at most once per tab (module-memoised promise) the first
// time any search is opened, then searched locally — instant after load.
let cache: Promise<SearchEntry[]> | null = null;

function loadIndex(): Promise<SearchEntry[]> {
  if (!cache) {
    cache = fetch("/api/search-index")
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((d: { entries?: SearchEntry[] }) => d.entries ?? [])
      .catch(() => {
        cache = null; // allow a retry on the next open
        return [];
      });
  }
  return cache;
}

/** Loads the search index when `active` (the search has been opened/focused).
 *  Returns the entries and whether the load has resolved. */
export function useSearchIndex(active: boolean): { entries: SearchEntry[]; ready: boolean } {
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    loadIndex().then((e) => {
      if (!alive) return;
      setEntries(e);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [active]);

  return { entries, ready };
}
