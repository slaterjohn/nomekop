"use client";

import { useCallback, useSyncExternalStore } from "react";

// Collected-card ticks, keyed per set+mode so a master-set binder tracks
// normal and reverse pockets independently of a standard one.
//   storage key: bindermon:v1:checklist:<setId>:<mode>
//   slot key:    <cardId>:<card|reverse>

const PREFIX = "bindermon:v1:checklist";

const listeners = new Set<() => void>();
// Snapshot cache per storage key — getSnapshot must return a stable reference
// between changes for useSyncExternalStore.
const snapshots = new Map<string, ReadonlySet<string>>();

function storageKey(setId: string, mode: string): string {
  return `${PREFIX}:${setId}:${mode}`;
}

function readSet(key: string): ReadonlySet<string> {
  const cached = snapshots.get(key);
  if (cached) return cached;
  let parsed: ReadonlySet<string>;
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    parsed = new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : []);
  } catch {
    parsed = new Set();
  }
  snapshots.set(key, parsed);
  return parsed;
}

function write(key: string, value: ReadonlySet<string>): void {
  snapshots.set(key, value);
  try {
    localStorage.setItem(key, JSON.stringify([...value]));
  } catch {
    // quota/private browsing — in-memory snapshot still serves this session
  }
  listeners.forEach((l) => l());
}

export function toggleSlot(setId: string, mode: string, slotKey: string): void {
  const key = storageKey(setId, mode);
  const next = new Set(readSet(key));
  if (next.has(slotKey)) {
    next.delete(slotKey);
  } else {
    next.add(slotKey);
  }
  write(key, next);
}

export function clearChecklist(setId: string, mode: string): void {
  write(storageKey(setId, mode), new Set());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith(PREFIX)) {
      if (e.key) snapshots.delete(e.key);
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: ReadonlySet<string> = new Set();

/** Reactive collected-set for one binder (set + mode). */
export function useChecklist(setId: string | undefined, mode: string) {
  const key = setId ? storageKey(setId, mode) : null;

  const collected = useSyncExternalStore(
    subscribe,
    () => (key ? readSet(key) : EMPTY),
    () => EMPTY,
  );

  const toggle = useCallback(
    (slotKey: string) => {
      if (setId) toggleSlot(setId, mode, slotKey);
    },
    [setId, mode],
  );

  const isChecked = useCallback((slotKey: string) => collected.has(slotKey), [collected]);

  return { collected, toggle, isChecked, count: collected.size };
}

/** Test-only: drops snapshot caches so isolated tests see a clean slate. */
export function __resetChecklistStoreForTests(): void {
  snapshots.clear();
}
