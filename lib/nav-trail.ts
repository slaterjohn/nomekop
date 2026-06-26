// Per-tab breadcrumb trail: the actual sequence of in-app pages the user visited
// to reach the current one. Drives the contextual breadcrumb (components/
// breadcrumbs.tsx), which reflects the path taken and falls back to each page's
// logical default on a direct landing. sessionStorage, same bindermon:v1:
// convention as use-remembered-spread / scroll-memory.

export type Crumb = { url: string; label: string };

const TRAIL_KEY = "bindermon:v1:trail";

/** Cap so a long session can't grow the trail unbounded; oldest dropped. */
export const MAX_TRAIL = 8;

export function readTrail(): Crumb[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(TRAIL_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as Crumb[]) : [];
  } catch {
    return [];
  }
}

function write(trail: Crumb[]): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(TRAIL_KEY, JSON.stringify(trail));
  } catch {
    // best-effort
  }
}

/** Record a visit to `url` and return the updated trail. Revisiting a page
 *  already in the trail collapses everything after it (so Back / loops keep the
 *  trail a clean path); a new page is appended (capped to MAX_TRAIL). */
export function pushTrail(url: string, label: string): Crumb[] {
  const trail = readTrail();
  const idx = trail.findIndex((c) => c.url === url);
  let next: Crumb[];
  if (idx >= 0) {
    next = trail.slice(0, idx + 1);
    next[idx] = { url, label };
  } else {
    next = [...trail, { url, label }];
    if (next.length > MAX_TRAIL) next = next.slice(next.length - MAX_TRAIL);
  }
  write(next);
  return next;
}
