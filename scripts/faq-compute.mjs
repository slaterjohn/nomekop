// Pure, dependency-free Pokémon TCG fact computation shared by the FAQ
// snapshot generator (scripts/build-faqs.mjs) and its guard test
// (test/unit/faqs-compute.test.ts). No DB, no @/ imports — so it runs both
// under plain `node` and under vitest. Guarded against the app's real
// expandSlots / rarityRank by the test, so it can't drift silently.

// Mirror of lib/tcg/rarity.ts ORDER (commonest → rarest). The guard test
// asserts this stays identical to the app's rarityRank.
export const RARITY_ORDER = [
  "Common", "Uncommon", "Rare", "Rare Holo", "Promo", "Rare Holo EX",
  "Rare Holo GX", "Rare Holo V", "Rare Holo VMAX", "Rare Holo VSTAR",
  "Double Rare", "Rare BREAK", "Rare Prime", "Rare Prism Star", "Rare ACE",
  "ACE SPEC Rare", "Rare Ultra", "Ultra Rare", "Rare Shiny", "Shiny Rare",
  "Rare Shiny GX", "Shiny Ultra Rare", "Radiant Rare", "Amazing Rare",
  "Illustration Rare", "Trainer Gallery Rare Holo", "Rare Secret",
  "Rare Rainbow", "Special Illustration Rare", "Rare Shining", "LEGEND",
  "Hyper Rare",
];
const RANK = new Map(RARITY_ORDER.map((n, i) => [n.toLowerCase(), i + 1]));
const UNKNOWN_RANK = 5;
export function rarityRank(rarity) {
  if (!rarity) return 0;
  return RANK.get(String(rarity).toLowerCase()) ?? UNKNOWN_RANK;
}

const ILLUSTRATION_RARITIES = new Set(["illustration rare", "special illustration rare"]);
const EVERGREEN = new Set([
  "charizard", "pikachu", "eevee", "mewtwo", "umbreon", "gengar", "lucario", "rayquaza", "mew",
]);
const DOUBLE_RARE_RANK = rarityRank("Double Rare"); // marquee/chase threshold

/** Highest market value across a card's print variants; undefined if unpriced. */
export function marketPriceOf(card) {
  const prices = card?.tcgplayer?.prices;
  if (!prices) return undefined;
  let best;
  for (const range of Object.values(prices)) {
    const v = range.market ?? range.high ?? range.mid ?? range.low;
    if (typeof v === "number" && (best === undefined || v > best)) best = v;
  }
  return best;
}

/** Trailing integer of a collector number ("145" → 145, "TG01" → 1, "SV001" → 1). */
function numberValue(number) {
  const m = String(number).match(/(\d+)\s*$/);
  return m ? Number(m[1]) : 0;
}

export function cardRef(card) {
  const ref = { id: card.id, name: card.name, number: card.number, rarity: card.rarity };
  const price = marketPriceOf(card);
  if (typeof price === "number") ref.marketPrice = price;
  return ref;
}

export function masterSlotCount(cards) {
  // Mirrors lib/layout/expand.ts master mode: 1 card slot + reverse + pokeball
  // + masterball per card, secrets included (the app's default master config).
  let n = 0;
  for (const c of cards) {
    const v = c.variants ?? {};
    n += 1;
    if (v.reverse) n += 1;
    if (v.pokeball) n += 1;
    if (v.masterball) n += 1;
  }
  return n;
}

export function reverseHoloCount(cards) {
  return cards.filter((c) => c.variants?.reverse).length;
}
export function ballCounts(cards) {
  return {
    pokeball: cards.filter((c) => c.variants?.pokeball).length,
    masterball: cards.filter((c) => c.variants?.masterball).length,
  };
}
export function supertypeCounts(cards) {
  const out = { pokemon: 0, trainer: 0, energy: 0 };
  for (const c of cards) {
    if (c.supertype === "Pokémon") out.pokemon += 1;
    else if (c.supertype === "Trainer") out.trainer += 1;
    else if (c.supertype === "Energy") out.energy += 1;
  }
  return out;
}
export function illustrationRareCount(cards) {
  return cards.filter((c) => ILLUSTRATION_RARITIES.has(String(c.rarity ?? "").toLowerCase())).length;
}
export function rarityHistogram(cards) {
  const out = {};
  for (const c of cards) {
    const key = c.rarity ?? "(unlisted)";
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

/** Rarest by rank; ties broken by higher collector number, then market price. */
export function rarestOf(cards) {
  const best = [...cards].sort((a, b) => {
    const r = rarityRank(b.rarity) - rarityRank(a.rarity);
    if (r) return r;
    const n = numberValue(b.number) - numberValue(a.number);
    if (n) return n;
    return (marketPriceOf(b) ?? 0) - (marketPriceOf(a) ?? 0);
  })[0];
  return cardRef(best);
}

/** Highest market price; undefined when the set has no priced cards. */
export function mostValuableOf(cards) {
  let best, bestPrice = -1;
  for (const c of cards) {
    const p = marketPriceOf(c);
    if (typeof p === "number" && p > bestPrice) { bestPrice = p; best = c; }
  }
  return best ? cardRef(best) : undefined;
}

/** Top n chase cards by (rarity rank, price); distinct; Pokémon preferred on ties. */
export function chaseOf(cards, n = 6) {
  return [...cards]
    .sort((a, b) => {
      const r = rarityRank(b.rarity) - rarityRank(a.rarity);
      if (r) return r;
      const p = (marketPriceOf(b) ?? 0) - (marketPriceOf(a) ?? 0);
      if (p) return p;
      return (b.supertype === "Pokémon" ? 1 : 0) - (a.supertype === "Pokémon" ? 1 : 0);
    })
    .slice(0, n)
    .map(cardRef);
}

export function baseSpecies(name) {
  return String(name).replace(/\s+(ex|EX|V|VMAX|VSTAR|VMAX|GX|LV\.?X)\b.*$/, "").trim();
}
export function speciesSlug(name) {
  return baseSpecies(name).toLowerCase().replace(/['.]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Marquee/chase Pokémon for a set: chase-rarity Pokémon grouped by base
 *  species, ranked by their best card (rarity, price) with an evergreen nudge,
 *  capped at `cap`. Each entry lists every print of that species in the set. */
export function marqueePokemonOf(cards, cap = 5) {
  const groups = new Map();
  for (const c of cards) {
    if (c.supertype !== "Pokémon") continue;
    if (rarityRank(c.rarity) < DOUBLE_RARE_RANK) continue;
    const species = baseSpecies(c.name);
    const slug = speciesSlug(c.name);
    if (!groups.has(slug)) groups.set(slug, { slug, displayName: species, cards: [] });
    groups.get(slug).cards.push(c);
  }
  const score = (g) => {
    const top = Math.max(...g.cards.map((c) => rarityRank(c.rarity)));
    const price = Math.max(...g.cards.map((c) => marketPriceOf(c) ?? 0));
    const evergreen = EVERGREEN.has(g.slug.split("-")[0]) ? 1000 : 0;
    return top * 100000 + evergreen + price;
  };
  return [...groups.values()]
    .sort((a, b) => score(b) - score(a))
    .slice(0, cap)
    .map((g) => ({
      slug: g.slug,
      displayName: g.displayName,
      // List every print of the species, lowest collector number first.
      cards: g.cards.sort((a, b) => numberValue(a.number) - numberValue(b.number)).map(cardRef),
    }));
}
