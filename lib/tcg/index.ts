import pLimit from "p-limit";
import { CARDS_TTL_MS, SETS_TTL_MS, serverStore } from "@/lib/server-store";
import { FixtureSource } from "@/lib/tcg/fixture-source";
import { PokemonTcgIoSource } from "@/lib/tcg/pokemontcgio";
import {
  dexRangeInIndex,
  getCardIndex,
  searchArtistInIndex,
  searchNameInIndex,
} from "@/lib/tcg/card-index";
import {
  searchByIllustrator as tcgdexByIllustrator,
  searchByName as tcgdexByName,
} from "@/lib/tcg/tcgdex";
import { localizedPokemonName } from "@/lib/tcg/pokemon-i18n";
import { GENERATIONS, type GenerationId } from "@/lib/pokedex";
import type { CardDataSource, CardWithSet, TcgCard, TcgSet } from "@/lib/tcg/types";

function isFixtureMode(): boolean {
  return process.env.TCG_DATA_SOURCE === "fixture";
}

export function getDataSource(): CardDataSource {
  return isFixtureMode() ? new FixtureSource() : new PokemonTcgIoSource();
}

/**
 * Cross-set binders (Pokémon, illustrator, Pokédex) derive from the cached set
 * cards once every set is cached — instant and free for *every* entity, not
 * just pre-warmed ones. While the background build is still filling the cache
 * we fall back to a per-entity API query so cold starts still work.
 */
function indexIsComplete(): boolean {
  const total = serverStore.peek<TcgSet[]>("sets")?.length ?? 0;
  return total > 0 && getCardIndex().setCount >= total;
}

/** Sets list from the server database (24h TTL, stale-while-revalidate).
 *  Fixture mode reads straight from disk — caching local JSON invites staleness. */
export function getSets(): Promise<TcgSet[]> {
  if (isFixtureMode()) return getDataSource().getSets();
  return serverStore.getOrCompute("sets", SETS_TTL_MS, () => getDataSource().getSets());
}

/** Cards for one set (12h TTL so TCGplayer prices stay current). */
export function getCards(setId: string): Promise<TcgCard[]> {
  if (isFixtureMode()) return getDataSource().getCards(setId);
  return serverStore.getOrCompute(`cards:${setId}`, CARDS_TTL_MS, () =>
    getDataSource().getCards(setId),
  );
}

/** English cards for one Pokémon — derived from the cached set cards once the
 *  cache is complete; API-backed (12h TTL) until then. */
function englishPokemonCards(slug: string): Promise<CardWithSet[]> {
  if (isFixtureMode()) return getDataSource().searchCardsByName(slug);
  if (indexIsComplete()) return Promise.resolve(searchNameInIndex(slug, getCardIndex()));
  return serverStore.getOrCompute(`pokemon:${slug}`, CARDS_TTL_MS, () =>
    getDataSource().searchCardsByName(slug),
  );
}

/**
 * Every print of one Pokémon across all sets, in the chosen languages. English
 * comes from pokemontcg.io (+prices); other languages from TCGdex, matched by
 * the Pokémon's localized name (looked up from its National Dex number).
 */
export async function searchPokemonCards(
  name: string,
  langs: readonly string[] = ["en"],
): Promise<CardWithSet[]> {
  const slug = name.trim().toLowerCase();
  const english = await englishPokemonCards(slug);
  const others = langs.filter((l) => l !== "en");
  if (others.length === 0 || isFixtureMode()) return english;
  const dex = dominantDex(english);
  if (dex === undefined) return english;
  const extra = await Promise.all(
    others.map(async (lang) => {
      const localized = await localizedPokemonName(dex, lang);
      return localized ? tcgdexByName(localized, lang).catch(() => []) : [];
    }),
  );
  return [...english, ...extra.flat()];
}

function englishIllustratorCards(slug: string): Promise<CardWithSet[]> {
  if (isFixtureMode()) return getDataSource().searchCardsByArtist(slug);
  if (indexIsComplete()) return Promise.resolve(searchArtistInIndex(slug, getCardIndex()));
  return serverStore.getOrCompute(`illustrator:${slug}`, CARDS_TTL_MS, () =>
    getDataSource().searchCardsByArtist(slug),
  );
}

/** Every card illustrated by one artist, in the chosen languages. Illustrator
 *  credits are consistent across languages, so the English name queries TCGdex. */
export async function searchIllustratorCards(
  artist: string,
  langs: readonly string[] = ["en"],
): Promise<CardWithSet[]> {
  const slug = artist.trim().toLowerCase();
  const english = await englishIllustratorCards(slug);
  const others = langs.filter((l) => l !== "en");
  if (others.length === 0 || isFixtureMode()) return english;
  const name = dominantArtist(english);
  if (!name) return english;
  const extra = await Promise.all(
    others.map((lang) => tcgdexByIllustrator(name, lang).catch(() => [])),
  );
  return [...english, ...extra.flat()];
}

/** Every print for a generation's dex range. Derived from cache when complete;
 *  API-backed (12h TTL) until then. (Multi-language is handled per-pocket in the
 *  Pokédex view, not here, since whole-generation fetches would be too heavy.) */
export function getPokedexCards(gen: GenerationId): Promise<CardWithSet[]> {
  const range = GENERATIONS.find((g) => g.id === gen);
  if (!range) return Promise.resolve([]);
  if (isFixtureMode()) return getDataSource().getCardsByDexRange(range.min, range.max);
  if (indexIsComplete()) return Promise.resolve(dexRangeInIndex(range.min, range.max, getCardIndex()));
  return serverStore.getOrCompute(`pokedex:${gen}`, CARDS_TTL_MS, () =>
    getDataSource().getCardsByDexRange(range.min, range.max),
  );
}

/**
 * Non-English prints of one Pokémon, by National Dex number, across the given
 * languages — matched on the Pokémon's localized name via TCGdex. English is
 * skipped (it comes from getPokedexCards); empty in fixture mode. Powers the
 * Pokédex swap dialog's per-pocket lazy fetch, where a whole-generation union
 * would be far too heavy.
 */
export async function localizedPrintsByDex(
  dex: number,
  langs: readonly string[],
): Promise<CardWithSet[]> {
  const others = langs.filter((l) => l !== "en");
  if (others.length === 0 || isFixtureMode()) return [];
  const extra = await Promise.all(
    others.map(async (lang) => {
      const localized = await localizedPokemonName(dex, lang);
      return localized ? tcgdexByName(localized, lang).catch(() => []) : [];
    }),
  );
  // TCGdex cards have no National Dex number. But we searched by *this* Pokémon's
  // localized name, so every match is this Pokémon — stamp the dex so the Pokédex
  // (which slots cards by dex number) can place them in the right pocket.
  return extra.flat().map((card) => ({ ...card, dex: [dex] }));
}

/** Bound the fan-out when assembling a whole generation in another language —
 *  ~150 Pokémon, each a PokéAPI + TCGdex lookup; politeness over raw speed. */
const localizedDexLimit = pLimit(8);

/**
 * Every Pokémon of a generation in ONE non-English language — the data behind a
 * whole-binder language swap on the Pokédex. Fetched per-Pokémon (TCGdex has no
 * dex query) with bounded concurrency, then cached as a unit so the expensive
 * fan-out runs at most once per generation/language per TTL. English never comes
 * here (it derives from the fast cached set index via getPokedexCards).
 */
export function getLocalizedPokedexCards(
  gen: GenerationId,
  lang: string,
): Promise<CardWithSet[]> {
  const range = GENERATIONS.find((g) => g.id === gen);
  if (!range || lang === "en" || isFixtureMode()) return Promise.resolve([]);
  return serverStore.getOrCompute(`pokedex:${gen}:${lang}`, CARDS_TTL_MS, async () => {
    const dexes = Array.from({ length: range.max - range.min + 1 }, (_, i) => range.min + i);
    const perDex = await Promise.all(
      dexes.map((dex) => localizedDexLimit(() => localizedPrintsByDex(dex, [lang]))),
    );
    return perDex.flat();
  });
}

/** Most common National Dex number among cards — the binder's Pokémon. */
function dominantDex(cards: CardWithSet[]): number | undefined {
  const counts = new Map<number, number>();
  for (const c of cards) for (const d of c.dex ?? []) counts.set(d, (counts.get(d) ?? 0) + 1);
  let best: number | undefined;
  let bestN = 0;
  for (const [d, n] of counts) {
    if (n > bestN) {
      best = d;
      bestN = n;
    }
  }
  return best;
}

/** Most common illustrator credit among cards. */
function dominantArtist(cards: CardWithSet[]): string | undefined {
  const counts = new Map<string, number>();
  for (const c of cards) if (c.artist) counts.set(c.artist, (counts.get(c.artist) ?? 0) + 1);
  let best: string | undefined;
  let bestN = 0;
  for (const [a, n] of counts) {
    if (n > bestN) {
      best = a;
      bestN = n;
    }
  }
  return best;
}
