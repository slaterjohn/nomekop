// Shared fuzzy scoring for site search, generalised from the original
// lib/pokemon-search.ts so the Pokémon typeahead and the site-wide search rank
// identically. Pure, client- and server-safe (no I/O, no directives).

/** Accent-folded, lowercased key with punctuation/space stripped:
 *  "Flabébé" → "flabebe", "Mr. Mime" → "mrmime", "Ho-Oh" → "hooh". */
export function foldKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** True when every char of `q` appears in `s` in order (loose fuzzy match). */
function isSubsequence(q: string, s: string): boolean {
  let i = 0;
  for (let j = 0; j < s.length && i < q.length; j++) {
    if (s[j] === q[i]) i++;
  }
  return i === q.length;
}

/** Levenshtein distance — small strings, plain DP. */
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

/** 0 = no match; higher is better. Both args are pre-folded keys. Tiers: exact >
 *  prefix > substring > subsequence, with an edit-distance fallback for typos. */
export function score(q: string, k: string): number {
  if (!q || !k) return 0;
  if (k === q) return 1000;
  if (k.startsWith(q)) return 900 + q.length / k.length;
  const at = k.indexOf(q);
  if (at >= 0) return 700 - at;
  if (q.length >= 2 && isSubsequence(q, k)) return 500 - (k.length - q.length);
  if (q.length >= 3) {
    const dist = editDistance(q, k);
    const sim = 1 - dist / Math.max(q.length, k.length);
    if (sim >= 0.6) return 300 * sim;
  }
  return 0;
}

/** Convenience: fold both sides and score. 0 = no match. */
export function scoreLabel(query: string, label: string): number {
  return score(foldKey(query), foldKey(label));
}
