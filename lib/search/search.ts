import { scoreLabel } from "@/lib/search/fuzzy";
import type { SearchEntry, SearchGroup, SearchType } from "@/lib/search/types";

// Fixed group order + headings for grouped (global) results.
const GROUP_ORDER: SearchType[] = ["pokemon", "set", "artist", "faq", "fact"];
const GROUP_LABEL: Record<SearchType, string> = {
  pokemon: "Pokémon",
  set: "Sets",
  artist: "Artists",
  faq: "FAQs",
  fact: "Facts",
};

type Options = {
  /** Restrict to one type (section-scoped search). */
  scope?: SearchType;
  /** Max items per group. */
  perGroup?: number;
};

/** Rank entries against the query and bucket them by type. Empty groups are
 *  dropped; each is capped at `perGroup`. With `scope`, only that type's group is
 *  returned. Returns [] for a blank query. */
export function runSearch(query: string, entries: SearchEntry[], { scope, perGroup = 6 }: Options): SearchGroup[] {
  if (!query.trim()) return [];

  const scored: { entry: SearchEntry; s: number }[] = [];
  for (const entry of entries) {
    if (scope && entry.type !== scope) continue;
    const s = scoreLabel(query, entry.label);
    if (s > 0) scored.push({ entry, s });
  }
  scored.sort((a, b) => b.s - a.s || a.entry.label.length - b.entry.label.length || a.entry.label.localeCompare(b.entry.label));

  const order = scope ? [scope] : GROUP_ORDER;
  const groups: SearchGroup[] = [];
  for (const type of order) {
    const items = scored.filter((x) => x.entry.type === type).slice(0, perGroup).map((x) => x.entry);
    if (items.length > 0) groups.push({ type, label: GROUP_LABEL[type], items });
  }
  return groups;
}
