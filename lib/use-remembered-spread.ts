"use client";

import { useCallback, useState } from "react";

// Remembers which binder spread the user was on, keyed by the page URL, so
// navigating to a card and pressing Back restores the page instead of
// snapping to the start. sessionStorage = per-tab, cleared when the tab closes.

function storageKey(key: string): string {
  return `bindermon:v1:spread:${key}`;
}

function readInitial(key: string | undefined): number {
  if (!key || typeof window === "undefined") return 0;
  try {
    const raw = sessionStorage.getItem(storageKey(key));
    const n = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** [spreadIndex, setSpreadIndex] that persists to sessionStorage under `key`. */
export function useRememberedSpread(key: string | undefined): [number, (next: number) => void] {
  const [spreadIndex, setSpreadIndexState] = useState(() => readInitial(key));

  const setSpreadIndex = useCallback(
    (next: number) => {
      setSpreadIndexState(next);
      if (!key) return;
      try {
        sessionStorage.setItem(storageKey(key), String(next));
      } catch {
        // best-effort
      }
    },
    [key],
  );

  return [spreadIndex, setSpreadIndex];
}
