import { serverStore, type SqliteStore } from "@/lib/server-store";
import { toCardWithSet } from "@/lib/tcg/secret";
import { applyArtistOverrides } from "@/lib/tcg/artist-overrides";
import type { CardWithSet, TcgCard, TcgSet } from "@/lib/tcg/types";

/**
 * The cross-set binders (one Pokémon, one illustrator, one Pokédex generation)
 * used to hit the API once per entity. Once every set's cards are cached, the
 * same answers can be derived from that durable data with zero network calls —
 * so "all Pokémon" and "all illustrators" are warm the moment the sets are.
 *
 * This module unions every cached set's cards into one in-memory index and
 * filters it. The union is memoised and rebuilt only when the cache manager
 * invalidates it (a new set was fetched).
 */

export type CardIndex = {
  cards: CardWithSet[];
  /** How many sets contributed — compared against the known set count to tell
   *  whether the index is complete enough to serve instead of the API. */
  setCount: number;
};

let memo: CardIndex | null = null;

/** Collapse a name/artist to comparable form (lowercase, alphanumerics only).
 *  Mirrors the live API's fuzzy `*token*` search closely enough for binders
 *  while needing no network call: "Ho-Oh" and "ho-oh" both become "hooh". */
export function normalizeQuery(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Build (or reuse) the union of every cached set's cards. Reads the durable
 *  store via peek — no API calls, no TTL gating. */
export function getCardIndex(store: SqliteStore = serverStore): CardIndex {
  if (store === serverStore && memo) return memo;
  const built = buildIndex(store);
  if (store === serverStore) memo = built;
  return built;
}

/** Drop the memoised union so the next read rebuilds it. Called after the
 *  cache manager fetches new or refreshed set cards. */
export function invalidateCardIndex(): void {
  memo = null;
}

function buildIndex(store: SqliteStore): CardIndex {
  const sets = store.peek<TcgSet[]>("sets") ?? [];
  const cards: CardWithSet[] = [];
  let setCount = 0;
  for (const set of sets) {
    const setCards = store.peek<TcgCard[]>(`cards:${set.id}`);
    if (!setCards) continue;
    setCount += 1;
    // Fill missing illustrator credits (e.g. Prismatic Evolutions) so artist
    // search/stats over the index match what getCards serves. Ball patterns are
    // deliberately NOT applied here — cross-set binders don't use them.
    for (const c of applyArtistOverrides(setCards)) cards.push(toCardWithSet(c, set));
  }
  return { cards, setCount };
}

/** Every print whose name contains the query (e.g. "charizard" matches
 *  "Charizard", "Dark Charizard", "Charizard ex"). */
export function searchNameInIndex(query: string, index: CardIndex): CardWithSet[] {
  const needle = normalizeQuery(query);
  if (!needle) return [];
  return sortForBinder(index.cards.filter((c) => normalizeQuery(c.name).includes(needle)));
}

/** Every card whose illustrator credit contains the query. */
export function searchArtistInIndex(query: string, index: CardIndex): CardWithSet[] {
  const needle = normalizeQuery(query);
  if (!needle) return [];
  return sortForBinder(
    index.cards.filter((c) => c.artist && normalizeQuery(c.artist).includes(needle)),
  );
}

/** Every card for a Pokémon in the inclusive National Dex range. */
export function dexRangeInIndex(min: number, max: number, index: CardIndex): CardWithSet[] {
  return sortForBinder(index.cards.filter((c) => c.dex?.some((n) => n >= min && n <= max)));
}

/** Stable order matching the live API (`orderBy=set.releaseDate,number`); the
 *  binder layout re-sorts per the user's options, so this is just determinism. */
function sortForBinder(cards: CardWithSet[]): CardWithSet[] {
  return [...cards].sort(
    (a, b) =>
      a.setReleaseDate.localeCompare(b.setReleaseDate) ||
      a.number.localeCompare(b.number, undefined, { numeric: true }),
  );
}
