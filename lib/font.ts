"use client";

import { useCallback, useSyncExternalStore } from "react";
import { FONT_STORAGE_KEY } from "@/lib/themes";

// Font-type preference (Settings → Font): the app's pixel face (default), a
// monospaced face, or a sans-serif face. Applied as data-font on <html>, which
// CSS keys off to swap the --font-ui-* intermediate vars (app/globals.css). The
// brand wordmark is exempt (it uses --font-logo). Same external-store shape as
// lib/motion / theme-provider: localStorage is the source of truth, an emitter
// keeps every subscriber (and other tabs, via 'storage') in sync. The storage
// key lives in lib/themes (server-safe) so the pre-paint script can read it.
export { FONT_STORAGE_KEY };

export type FontType = "pixel" | "mono" | "sans";

const DEFAULT_FONT: FontType = "pixel";

function isFontType(value: unknown): value is FontType {
  return value === "pixel" || value === "mono" || value === "sans";
}

const listeners = new Set<() => void>();
let memoryFont: FontType | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === FONT_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): FontType {
  try {
    const raw = localStorage.getItem(FONT_STORAGE_KEY);
    if (isFontType(raw)) return raw;
  } catch {
    // fall through to memory
  }
  return memoryFont ?? DEFAULT_FONT;
}

export function useFont(): { font: FontType; setFont: (font: FontType) => void } {
  const font = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_FONT);
  const setFont = useCallback((next: FontType) => {
    memoryFont = next;
    document.documentElement.dataset.font = next;
    try {
      localStorage.setItem(FONT_STORAGE_KEY, next);
    } catch {
      // best-effort persistence (private browsing, quota)
    }
    emit();
  }, []);
  return { font, setFont };
}

/** Test-only: reset module state. */
export function __resetFontForTests(): void {
  memoryFont = null;
}
