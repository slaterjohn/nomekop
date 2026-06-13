"use client";

import { useCallback, useSyncExternalStore } from "react";
import { TRACKS } from "@/lib/music/tracks";

// Whether the background soundtrack is on — opt-in, off by default, persisted to
// this browser. Mirrors lib/sound.ts so it behaves like the other audio toggles.

const KEY = "bindermon:v1:music";

const listeners = new Set<() => void>();
let memoryOn: boolean | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) onChange();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
  } catch {
    // fall through
  }
  return memoryOn ?? false;
}

export function setMusicEnabled(on: boolean): void {
  memoryOn = on;
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    // best-effort persistence
  }
  emit();
}

export function useMusicEnabled(): { enabled: boolean; setEnabled: (on: boolean) => void } {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const setEnabled = useCallback((on: boolean) => setMusicEnabled(on), []);
  return { enabled, setEnabled };
}

// A random theme offset, fixed for this page load: it shifts each area's theme so
// reloads start on a different variation, while navigation still transitions
// predictably between areas within the session.
let offset: number | null = null;
export function trackOffset(): number {
  if (offset === null) offset = Math.floor(Math.random() * TRACKS.length);
  return offset;
}

/** Test-only reset. */
export function __resetMusicForTests(): void {
  memoryOn = null;
  offset = null;
}
