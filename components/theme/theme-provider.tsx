"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_THEME, THEME_STORAGE_KEY, isThemeId, type ThemeId } from "@/lib/themes";

// Module-level external store: localStorage is the source of truth, an
// emitter keeps every subscriber (and other tabs, via 'storage') in sync.
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

// Fallback for environments where storage writes fail (private browsing):
// the session still tracks the chosen theme in memory.
let memoryTheme: ThemeId | null = null;

/** Test-only: clears the in-memory fallback between isolated test cases. */
export function __resetThemeStoreForTests() {
  memoryTheme = null;
}

function getSnapshot(): ThemeId {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeId(stored)) return stored;
  } catch {
    // fall through to memory
  }
  return memoryTheme ?? DEFAULT_THEME;
}

export function useTheme(): { theme: ThemeId; setTheme: (theme: ThemeId) => void } {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_THEME);

  const setTheme = useCallback((next: ThemeId) => {
    memoryTheme = next;
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Persistence is best-effort (private browsing, quota).
    }
    emit();
  }, []);

  return { theme, setTheme };
}
