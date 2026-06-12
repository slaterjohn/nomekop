"use client";

import { useCallback, useSyncExternalStore } from "react";

// Secret-arcade persistence: per-game best scores plus a one-time "discovered"
// flag (so the reopen pokeball survives a refresh once you've found the arcade).
// Mirrors the app's other stores (sound, checklist): a shared listener set +
// useSyncExternalStore, all writes best-effort so private browsing never throws.
//
//   best score key:  bindermon:v1:arcade:<game>
//   discovered key:   bindermon:v1:arcade:discovered

const PREFIX = "bindermon:v1:arcade";
const DISCOVERED_KEY = `${PREFIX}:discovered`;

export type ArcadeGameId = "orb-flip" | "safari-dash" | "echo-match";

const listeners = new Set<() => void>();
// In-memory fallbacks keep the session coherent when localStorage is blocked.
const memory = new Map<string, number>();
let memoryDiscovered = false;

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith(PREFIX)) onChange();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

function scoreKey(game: ArcadeGameId): string {
  return `${PREFIX}:${game}`;
}

function readScore(game: ArcadeGameId): number {
  try {
    const raw = localStorage.getItem(scoreKey(game));
    if (raw != null) {
      const n = Number.parseInt(raw, 10);
      if (Number.isFinite(n)) return n;
    }
  } catch {
    // fall through to memory
  }
  return memory.get(game) ?? 0;
}

/** Persist `score` as the new best for `game` iff it beats the stored value. */
export function reportScore(game: ArcadeGameId, score: number): void {
  if (!Number.isFinite(score) || score <= readScore(game)) return;
  memory.set(game, score);
  try {
    localStorage.setItem(scoreKey(game), String(score));
  } catch {
    // best-effort persistence
  }
  emit();
}

/** Reactive best score for one game (0 until something is recorded). */
export function useBestScore(game: ArcadeGameId): number {
  return useSyncExternalStore(
    subscribe,
    () => readScore(game),
    () => 0,
  );
}

function readDiscovered(): boolean {
  try {
    if (localStorage.getItem(DISCOVERED_KEY) === "1") return true;
  } catch {
    // fall through
  }
  return memoryDiscovered;
}

/** Mark the arcade as discovered so the floating reopen button persists. */
export function markDiscovered(): void {
  if (readDiscovered()) return;
  memoryDiscovered = true;
  try {
    localStorage.setItem(DISCOVERED_KEY, "1");
  } catch {
    // best-effort persistence
  }
  emit();
}

/** Reactive "has the player ever found the arcade" flag. */
export function useDiscovered(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => readDiscovered(),
    () => false,
  );
}

/** Imperative read for the reopen button on mount (event-safe, non-render). */
export function getDiscovered(): boolean {
  return readDiscovered();
}

export function useReportScore(): (game: ArcadeGameId, score: number) => void {
  return useCallback((game, score) => reportScore(game, score), []);
}

/** Test-only: wipe in-memory fallbacks so isolated tests start clean. */
export function __resetArcadeStoreForTests(): void {
  memory.clear();
  memoryDiscovered = false;
}
