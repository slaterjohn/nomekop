"use client";

import { useCallback, useSyncExternalStore } from "react";
import { FONT_SIZE_STORAGE_KEY } from "@/lib/themes";

// Text-size preset (Settings → Text size): four steps — "0" 100% (default),
// "1" 112%, "2" 125%, "3" 140%. Applied as data-font-size on <html>; CSS `zoom`
// scales the px-based pixel UI and reflows (app/globals.css). Same external-store
// shape as lib/font / lib/motion. The storage key lives in lib/themes
// (server-safe) so the pre-paint script can read it.
export { FONT_SIZE_STORAGE_KEY };

export type FontSize = "0" | "1" | "2" | "3";

const DEFAULT_SIZE: FontSize = "0";

function isFontSize(value: unknown): value is FontSize {
  return value === "0" || value === "1" || value === "2" || value === "3";
}

const listeners = new Set<() => void>();
let memorySize: FontSize | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === FONT_SIZE_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): FontSize {
  try {
    const raw = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    if (isFontSize(raw)) return raw;
  } catch {
    // fall through to memory
  }
  return memorySize ?? DEFAULT_SIZE;
}

export function useFontSize(): { size: FontSize; setSize: (size: FontSize) => void } {
  const size = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_SIZE);
  const setSize = useCallback((next: FontSize) => {
    memorySize = next;
    document.documentElement.dataset.fontSize = next;
    try {
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, next);
    } catch {
      // best-effort persistence (private browsing, quota)
    }
    emit();
  }, []);
  return { size, setSize };
}

/** Test-only: reset module state. */
export function __resetFontSizeForTests(): void {
  memorySize = null;
}
