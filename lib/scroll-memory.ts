// Per-tab memory of window scroll positions, keyed by page URL — so pressing
// Back (in-app or browser) returns to where you were instead of the top. The
// ScrollRestorer component (components/scroll-restorer.tsx) drives it; this
// module is the pure storage layer. Mirrors the bindermon:v1: sessionStorage
// convention used by use-remembered-spread.ts.

const STORAGE_KEY = "bindermon:v1:scroll";

/** Cap so a long session can't grow sessionStorage unbounded; oldest evicted. */
export const MAX_SCROLL_ENTRIES = 50;

function read(): Record<string, number> {
  if (typeof sessionStorage === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function write(map: Record<string, number>): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // best-effort (quota / privacy mode)
  }
}

/** Remember the scroll offset for a url (floored, non-negative). Re-inserting a
 *  key moves it to newest; the oldest is evicted past MAX_SCROLL_ENTRIES. */
export function rememberScroll(url: string, y: number): void {
  const map = read();
  delete map[url]; // re-insert at the end (newest) so eviction is LRU-by-write
  map[url] = Math.max(0, Math.floor(y) || 0);
  const keys = Object.keys(map);
  for (let i = 0; i < keys.length - MAX_SCROLL_ENTRIES; i++) delete map[keys[i]!];
  write(map);
}

/** The remembered scroll offset for a url, or undefined if none. */
export function recallScroll(url: string): number | undefined {
  const y = read()[url];
  return typeof y === "number" && Number.isFinite(y) ? y : undefined;
}

const INTENT_KEY = "bindermon:v1:scroll-intent";

/** Mark that the next navigation should RESTORE scroll (not reset to top) —
 *  e.g. a breadcrumb click going back to a page, which is a push (forward) nav
 *  the ScrollRestorer would otherwise send to the top. */
export function setRestoreIntent(url: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(INTENT_KEY, url);
  } catch {
    // best-effort
  }
}

/** Single-use: clears any pending intent and reports whether it was for `url`.
 *  Always clears, so a stale intent can't fire on a later unrelated navigation. */
export function consumeRestoreIntent(url: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    const intent = sessionStorage.getItem(INTENT_KEY);
    if (intent !== null) sessionStorage.removeItem(INTENT_KEY);
    return intent === url;
  } catch {
    return false;
  }
}
