"use client";

import { useCallback, useSyncExternalStore } from "react";
import { COLOR_SCHEME_STORAGE_KEY } from "@/lib/themes";

// Colour-scheme preference (Settings → Appearance): "system" (default, follows
// the OS), "light", or "dark". The STORED value is the preference; the value
// APPLIED to html[data-color-scheme] is the RESOLVED "light" | "dark" (CSS only
// keys off light/dark — see the dark palette blocks in app/globals.css). When
// the pref is "system", live OS changes are re-resolved by
// components/theme/color-scheme-controller.tsx. Same external-store shape as
// lib/font / lib/motion; the key lives in lib/themes (server-safe) so the
// pre-paint script can read it.
export { COLOR_SCHEME_STORAGE_KEY };

export type ColorSchemePref = "system" | "light" | "dark";
export type ResolvedScheme = "light" | "dark";

const DEFAULT_PREF: ColorSchemePref = "system";

function isPref(value: unknown): value is ColorSchemePref {
  return value === "system" || value === "light" || value === "dark";
}

/** Resolve a preference to the concrete scheme to apply. "system" follows the
 *  OS via matchMedia; "light"/"dark" pass through. SSR-safe (no window → light). */
export function resolveScheme(pref: ColorSchemePref): ResolvedScheme {
  if (pref === "dark") return "dark";
  if (pref === "light") return "light";
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const listeners = new Set<() => void>();
let memoryPref: ColorSchemePref | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === COLOR_SCHEME_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): ColorSchemePref {
  try {
    const raw = localStorage.getItem(COLOR_SCHEME_STORAGE_KEY);
    if (isPref(raw)) return raw;
  } catch {
    // fall through to memory
  }
  return memoryPref ?? DEFAULT_PREF;
}

export function useColorScheme(): {
  scheme: ColorSchemePref;
  setScheme: (pref: ColorSchemePref) => void;
} {
  const scheme = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_PREF);
  const setScheme = useCallback((pref: ColorSchemePref) => {
    memoryPref = pref;
    document.documentElement.dataset.colorScheme = resolveScheme(pref);
    try {
      localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, pref);
    } catch {
      // best-effort persistence (private browsing, quota)
    }
    emit();
  }, []);
  return { scheme, setScheme };
}

/** Test-only: reset module state. */
export function __resetColorSchemeForTests(): void {
  memoryPref = null;
}
