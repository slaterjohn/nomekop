"use client";

import { parseConfig, serializeConfig, type BinderConfig } from "@/lib/config";

// Per-set layout preferences: when you re-open a set, your last rows/cols/
// mode/variant choices come back. Stored compactly (defaults omitted) and
// re-validated through the config schema on read.
//   key: bindermon:v1:setconfig:<setId>

const key = (setId: string) => `bindermon:v1:setconfig:${setId}`;

export function saveSetConfig(config: BinderConfig): void {
  if (!config.set) return;
  try {
    const qs = serializeConfig(config);
    qs.delete("set");
    localStorage.setItem(key(config.set), qs.toString());
  } catch {
    // best-effort persistence
  }
}

/** The saved preferences for a set (without `set` itself), or null. */
export function loadSetConfig(setId: string): Omit<BinderConfig, "set"> | null {
  try {
    const raw = localStorage.getItem(key(setId));
    if (raw === null) return null;
    const parsed = parseConfig(Object.fromEntries(new URLSearchParams(raw)));
    const { set: _set, ...rest } = parsed;
    return rest;
  } catch {
    return null;
  }
}
