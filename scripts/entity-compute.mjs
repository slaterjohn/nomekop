// Pure, dependency-free entity (Pokémon / illustrator) stat computation shared
// by the entity snapshot generator (scripts/build-entities.mjs) and its guard
// test (test/unit/entity-compute.test.ts). No DB, no @/ imports — runs both
// under plain `node` and under vitest. Rarity/species/price helpers are reused
// from faq-compute.mjs so the two snapshots can't disagree; the guard test pins
// the reused definitions to the app's authoritative lib/tcg/rarity.ts.

import {
  illustrationRareCount,
  mostValuableOf,
  rarestOf,
  rarityHistogram,
} from "./faq-compute.mjs";

/** Special Illustration Rare — the "SIR" people ask about. Pinned to the app's
 *  rarity list by the guard test. */
export const SIR_RARITY = "Special Illustration Rare";

/** Illustration Rare + Special Illustration Rare (the faq-compute definition). */
export { illustrationRareCount as illustrationCount };

/** Mirror of lib/illustrator-binder.ts slugifyArtistName (guard-tested): lowercase,
 *  spaces → dashes, everything else preserved so URLs match the existing binder. */
export function slugifyArtistName(name) {
  return String(name).trim().toLowerCase().replace(/\s+/g, "-");
}

/** Every card whose National Dex array includes `dex` — exact species, unlike
 *  the substring binder ("mew" would otherwise match "Mewtwo"). */
export function cardsForDex(cards, dex) {
  return cards.filter((c) => Array.isArray(c.dex) && c.dex.includes(dex));
}

export function sirCount(cards) {
  const key = SIR_RARITY.toLowerCase();
  return cards.filter((c) => String(c.rarity ?? "").toLowerCase() === key).length;
}

export function distinctArtistCount(cards) {
  const set = new Set();
  for (const c of cards) if (c.artist && String(c.artist).trim()) set.add(c.artist);
  return set.size;
}

export function distinctSetCount(cards) {
  return new Set(cards.map((c) => c.setId)).size;
}

/** The set with the min (earliest) or max (latest) release date among `cards`,
 *  as { id, name, releaseDate }. All cards of a set share the date, so any card
 *  of the extreme set yields the right tuple. */
function extremeSet(cards, pickLater) {
  let best;
  for (const c of cards) {
    if (!c.setId) continue;
    if (!best) {
      best = c;
      continue;
    }
    const cmp = String(c.setReleaseDate ?? "").localeCompare(String(best.setReleaseDate ?? ""));
    if (pickLater ? cmp > 0 : cmp < 0) best = c;
  }
  return best ? { id: best.setId, name: best.setName, releaseDate: best.setReleaseDate } : undefined;
}
export function earliestSet(cards) {
  return extremeSet(cards, false);
}
export function latestSet(cards) {
  return extremeSet(cards, true);
}

/** The card that best represents an entity: the most valuable print, falling
 *  back to the rarest when nothing is priced. undefined for an empty list. */
export function signatureCardOf(cards) {
  if (cards.length === 0) return undefined;
  return mostValuableOf(cards) ?? rarestOf(cards);
}

/** Top `n` species an artist has drawn, grouped by dex (so "Dark Charizard" and
 *  "Charizard ex" both count as Charizard), ranked by card count. `nameByDex`
 *  maps a dex number to its canonical { name, slug } (from pokemon-names.json). */
export function topSpeciesFor(cards, n, nameByDex) {
  const counts = new Map(); // dex -> count
  for (const c of cards) {
    if (!Array.isArray(c.dex)) continue;
    for (const d of c.dex) counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([dex, count]) => {
      const meta = nameByDex.get(dex);
      return meta ? { slug: meta.slug, name: meta.name, count } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, n);
}

/** Full Pokémon entity for a species and its (already dex-filtered) cards. */
export function pokemonStatsFor({ dex, name, slug }, cards) {
  return {
    dex,
    slug,
    name,
    cardCount: cards.length,
    sirCount: sirCount(cards),
    illustrationRareCount: illustrationRareCount(cards),
    artistCount: distinctArtistCount(cards),
    setCount: distinctSetCount(cards),
    firstSet: earliestSet(cards),
    latestSet: latestSet(cards),
    rarities: rarityHistogram(cards),
    signatureCard: signatureCardOf(cards),
  };
}

/** Group every card by artist slug. Returns the full-stat `artists` (those at or
 *  above `threshold`, card-count desc) and an `artistIndex` of EVERY artist
 *  (slug, display name, cardCount) for cross-linking + gating decisions. */
export function artistStatsFrom(cards, threshold, nameByDex) {
  const groups = new Map(); // slug -> { cards, rawNameCounts }
  for (const c of cards) {
    if (!c.artist || !String(c.artist).trim()) continue;
    const slug = slugifyArtistName(c.artist);
    let g = groups.get(slug);
    if (!g) {
      g = { slug, cards: [], rawNameCounts: new Map() };
      groups.set(slug, g);
    }
    g.cards.push(c);
    g.rawNameCounts.set(c.artist, (g.rawNameCounts.get(c.artist) ?? 0) + 1);
  }

  // Canonical display name = the raw credit that appears most for this slug.
  const displayName = (g) =>
    [...g.rawNameCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];

  const artistIndex = [...groups.values()]
    .map((g) => ({ slug: g.slug, name: displayName(g), cardCount: g.cards.length, setCount: distinctSetCount(g.cards) }))
    .sort((a, b) => b.cardCount - a.cardCount || a.name.localeCompare(b.name));

  const artists = [...groups.values()]
    .filter((g) => g.cards.length >= threshold)
    .map((g) => ({
      slug: g.slug,
      name: displayName(g),
      cardCount: g.cards.length,
      setCount: distinctSetCount(g.cards),
      illustrationCount: illustrationRareCount(g.cards),
      earliestSet: earliestSet(g.cards),
      latestSet: latestSet(g.cards),
      topPokemon: topSpeciesFor(g.cards, 10, nameByDex),
      signatureCard: signatureCardOf(g.cards),
    }))
    .sort((a, b) => b.cardCount - a.cardCount || a.name.localeCompare(b.name));

  return { artists, artistIndex };
}
