"use client";

import { useCallback, useSyncExternalStore } from "react";

// In-app "reduce animation" override. Independent of the OS
// prefers-reduced-motion: this lets a user kill all motion even when their
// system allows it. Applied as data-reduce-motion="1" on <html>, which a global
// CSS reset (app/globals.css) keys off to strip every animation/transition.

export const MOTION_STORAGE_KEY = "bindermon:v1:motion";

const listeners = new Set<() => void>();
let memoryReduced: boolean | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === MOTION_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): boolean {
  try {
    const raw = localStorage.getItem(MOTION_STORAGE_KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
  } catch {
    // fall through to memory
  }
  return memoryReduced ?? false;
}

export function useReducedMotion(): { reduced: boolean; setReduced: (on: boolean) => void } {
  const reduced = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const setReduced = useCallback((on: boolean) => {
    memoryReduced = on;
    const root = document.documentElement;
    if (on) root.dataset.reduceMotion = "1";
    else delete root.dataset.reduceMotion;
    try {
      localStorage.setItem(MOTION_STORAGE_KEY, on ? "1" : "0");
    } catch {
      // best-effort persistence
    }
    emit();
  }, []);
  return { reduced, setReduced };
}

/** Test-only: reset module state. */
export function __resetMotionForTests(): void {
  memoryReduced = null;
}
