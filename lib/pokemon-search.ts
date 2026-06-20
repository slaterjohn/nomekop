// Client- and server-safe fuzzy search over the National Dex species names
// (data/pokemon-names.json). Powers the /pokemon typeahead and the "did you
// mean" suggestions on a no-results binder. No server-only/client directive so
// both render paths can import it; pure functions, no I/O.

import names from "@/data/pokemon-names.json";

export type PokemonName = { dex: number; name: string; slug: string };

export const POKEMON_NAMES: PokemonName[] = names as PokemonName[];

/** Accent-folded, lowercased comparison key with punctuation/space stripped:
 *  "Flabébé" → "flabebe", "Mr. Mime" → "mrmime", "Ho-Oh" → "hooh". */
function key(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

type Indexed = PokemonName & { key: string };
const INDEX: Indexed[] = POKEMON_NAMES.map((p) => ({ ...p, key: key(p.name) }));

/** True when every char of `q` appears in `s` in order (a loose fuzzy match). */
function isSubsequence(q: string, s: string): boolean {
  let i = 0;
  for (let j = 0; j < s.length && i < q.length; j++) {
    if (s[j] === q[i]) i++;
  }
  return i === q.length;
}

/** Levenshtein distance — small strings, so the plain DP is fine. */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    prev = curr;
  }
  return prev[b.length]!;
}

/** 0 = no match; higher is better. Combines prefix / substring / subsequence
 *  tiers with an edit-distance fallback so typos still surface a near match. */
function score(q: string, k: string): number {
  if (!q) return 0;
  if (k === q) return 1000;
  if (k.startsWith(q)) return 900 + q.length / k.length;
  const at = k.indexOf(q);
  if (at >= 0) return 700 - at;
  if (q.length >= 2 && isSubsequence(q, k)) return 500 - (k.length - q.length);
  // Typo tolerance: only for queries long enough that edit-distance is meaningful.
  if (q.length >= 3) {
    const dist = editDistance(q, k);
    const sim = 1 - dist / Math.max(q.length, k.length);
    if (sim >= 0.6) return 300 * sim;
  }
  return 0;
}

function ranked(query: string): Array<{ item: Indexed; score: number }> {
  const q = key(query);
  if (!q) return [];
  const out: Array<{ item: Indexed; score: number }> = [];
  for (const entry of INDEX) {
    const s = score(q, entry.key);
    if (s > 0) out.push({ item: entry, score: s });
  }
  out.sort((a, b) => b.score - a.score || a.item.name.length - b.item.name.length || a.item.dex - b.item.dex);
  return out;
}

/** Typeahead matches for a partial name, best first. */
export function fuzzyMatchPokemon(query: string, limit = 8): PokemonName[] {
  return ranked(query)
    .slice(0, limit)
    .map((r) => r.item);
}

/** "Did you mean" suggestions for a query that returned no cards — drops an
 *  exact-key hit (that would have had cards) and keeps only plausible matches. */
export function suggestSimilarPokemon(query: string, limit = 6): PokemonName[] {
  const q = key(query);
  if (!q) return [];
  return ranked(query)
    .filter((r) => r.item.key !== q && r.score >= 180)
    .slice(0, limit)
    .map((r) => r.item);
}
