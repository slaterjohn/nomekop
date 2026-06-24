import pLimit from "p-limit";
import { CARDS_TTL_MS, SETS_TTL_MS, serverStore } from "@/lib/server-store";
import { FixtureSource } from "@/lib/tcg/fixture-source";
import { PokemonTcgIoSource } from "@/lib/tcg/pokemontcgio";
import { applyBallPatterns } from "@/lib/tcg/ball-patterns";
import {
  dexRangeInIndex,
  getCardIndex,
  searchArtistInIndex,
  searchNameInIndex,
} from "@/lib/tcg/card-index";
import {
  getLocalizedSets,
  searchByIllustrator as tcgdexByIllustrator,
  searchByName as tcgdexByName,
} from "@/lib/tcg/tcgdex";
import { localizedPokemonName } from "@/lib/tcg/pokemon-i18n";
import { buildSetOverlay, EMPTY_OVERLAY, type SetOverlay } from "@/lib/sets-overlay";
import { curatedEnglishSetName, curatedLinksFor } from "@/lib/set-links";
import { cardLanguagesEnabled } from "@/lib/features";
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

/** Cards for one set (12h TTL so TCGplayer prices stay current). Poké Ball /
 *  Master Ball / Energy patterns are applied HERE, at read time, on top of the
 *  cached raw cards — so a set's binder reflects the curated patterns without
 *  waiting for a cache refetch, and a stale payload can never hide them.
 *  applyBallPatterns is idempotent, so re-applying to a payload an older build
 *  baked is safe. */
export async function getCards(setId: string): Promise<TcgCard[]> {
  const cards = isFixtureMode()
    ? await getDataSource().getCards(setId)
    : await serverStore.getOrCompute(`cards:${setId}`, CARDS_TTL_MS, () =>
        getDataSource().getCards(setId),
      );
  return applyBallPatterns(setId, cards);
}

/**
 * Cache-only reads for the sitemap. The sitemap renders at request time, so it
 * must NEVER trigger a live API fetch (that would block the response). In live
 * mode these return whatever the first-launch cache build (lib/tcg/cache-manager)
 * has already stored — an empty list for a not-yet-warmed set, never a fetch.
 * Fixture mode reads the committed snapshots so tests stay deterministic.
 */
export async function getSetsForSitemap(): Promise<TcgSet[]> {
  if (isFixtureMode()) return getDataSource().getSets();
  return serverStore.peek<TcgSet[]>("sets") ?? [];
}

export async function getCardsForSitemap(setId: string): Promise<TcgCard[]> {
  if (isFixtureMode()) return getDataSource().getCards(setId);
  return serverStore.peek<TcgCard[]>(`cards:${setId}`) ?? [];
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
  const others = cardLanguagesEnabled() ? langs.filter((l) => l !== "en") : [];
  if (others.length === 0 || isFixtureMode()) return english;
  const dex = dominantDex(english);
  if (dex === undefined) return english;
  const extra = await Promise.all(
    others.map(async (lang) => {
      const localized = await localizedPokemonName(dex, lang);
      return localized ? tcgdexByName(localized, lang).catch(() => []) : [];
    }),
  );
  return withCanonicalSets([...english, ...extra.flat()]);
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
  const others = cardLanguagesEnabled() ? langs.filter((l) => l !== "en") : [];
  if (others.length === 0 || isFixtureMode()) return english;
  const name = dominantArtist(english);
  if (!name) return english;
  const extra = await Promise.all(
    others.map((lang) => tcgdexByIllustrator(name, lang).catch(() => [])),
  );
  return withCanonicalSets([...english, ...extra.flat()]);
}

type EnglishSetRef = { id: string; releaseDate: string };

/**
 * Bridge TCGdex set ids to their English (pokemontcg.io) set. Returns two maps:
 * `byTcgdexId` matches through TCGdex's own English set names (works for the
 * Western languages, which share TCGdex's set ids), and `byEnglishName` lets the
 * curated links (Japanese etc.) resolve a name to the English set.
 */
async function englishSetBridge(): Promise<{
  byTcgdexId: Map<string, EnglishSetRef>;
  byEnglishName: Map<string, EnglishSetRef>;
}> {
  const [english, tcgdexEn] = await Promise.all([getSets(), getLocalizedSets("en").catch(() => [])]);
  const byEnglishName = new Map<string, EnglishSetRef>();
  for (const set of english) {
    byEnglishName.set(set.name.trim().toLowerCase(), { id: set.id, releaseDate: set.releaseDate });
  }
  const byTcgdexId = new Map<string, EnglishSetRef>();
  for (const set of tcgdexEn) {
    const match = byEnglishName.get(set.name.trim().toLowerCase());
    if (match) byTcgdexId.set(set.id, match);
  }
  return { byTcgdexId, byEnglishName };
}

/**
 * Tag every card with a canonical (English) set id + release date so a binder can
 * place the same set's prints together across languages. English cards canonicalise
 * to themselves; localized cards borrow their English twin's id+date.
 *
 * Western languages (fr/de/es/it) share TCGdex's set ids with English, so the
 * TCGdex-name bridge pairs them. Japanese/Korean/Chinese use entirely different
 * set ids and names, so they resolve through the curated links in data/set-links.json
 * (the clean correspondences — 151 ↔ ポケモンカード151 etc.). Anything still
 * unmatched keeps its own release date and interleaves by era.
 */
async function withCanonicalSets(cards: CardWithSet[]): Promise<CardWithSet[]> {
  const { byTcgdexId, byEnglishName } = await englishSetBridge();
  return cards.map((card) => {
    const lang = card.lang ?? "en";
    if (lang === "en") {
      return { ...card, canonDate: card.setReleaseDate, canonSetId: card.setId };
    }
    let match = byTcgdexId.get(card.setId);
    if (!match) {
      const curatedName = curatedEnglishSetName(lang, card.setId);
      if (curatedName) match = byEnglishName.get(curatedName.trim().toLowerCase());
    }
    return {
      ...card,
      canonDate: match?.releaseDate ?? card.setReleaseDate,
      canonSetId: match?.id ?? card.setId,
    };
  });
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
  const others = cardLanguagesEnabled() ? langs.filter((l) => l !== "en") : [];
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
  if (!range || lang === "en" || isFixtureMode() || !cardLanguagesEnabled()) {
    return Promise.resolve([]);
  }
  return serverStore.getOrCompute(`pokedex:${gen}:${lang}`, CARDS_TTL_MS, async () => {
    const dexes = Array.from({ length: range.max - range.min + 1 }, (_, i) => range.min + i);
    const perDex = await Promise.all(
      dexes.map((dex) => localizedDexLimit(() => localizedPrintsByDex(dex, [lang]))),
    );
    return perDex.flat();
  });
}

/**
 * Localized sets overlaid on the English set list: which English sets also exist
 * in `lang` (badge), which have a translated name (interleave), and which are
 * language-exclusive (listed apart). Bridged through TCGdex's own English names,
 * since the two sources' set ids differ. Empty for English / fixture mode.
 */
export async function getSetOverlay(lang: string): Promise<SetOverlay> {
  if (lang === "en" || isFixtureMode() || !cardLanguagesEnabled()) return EMPTY_OVERLAY;
  const [english, tcgdexEn, tcgdexLang] = await Promise.all([
    getSets(),
    getLocalizedSets("en").catch(() => []),
    getLocalizedSets(lang).catch(() => []),
  ]);
  return buildSetOverlay(english, tcgdexEn, tcgdexLang, lang, curatedLinksFor(lang));
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
