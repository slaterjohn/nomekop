import { CARDS_TTL_MS, SETS_TTL_MS, serverStore } from "@/lib/server-store";
import { FixtureSource } from "@/lib/tcg/fixture-source";
import { PokemonTcgIoSource } from "@/lib/tcg/pokemontcgio";
import { GENERATIONS, type GenerationId } from "@/lib/pokedex";
import type { CardDataSource, CardWithSet, TcgCard, TcgSet } from "@/lib/tcg/types";

function isFixtureMode(): boolean {
  return process.env.TCG_DATA_SOURCE === "fixture";
}

export function getDataSource(): CardDataSource {
  return isFixtureMode() ? new FixtureSource() : new PokemonTcgIoSource();
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

/** Every print of one Pokémon across all sets (12h TTL). */
export function searchPokemonCards(name: string): Promise<CardWithSet[]> {
  const slug = name.trim().toLowerCase();
  if (isFixtureMode()) return getDataSource().searchCardsByName(slug);
  return serverStore.getOrCompute(`pokemon:${slug}`, CARDS_TTL_MS, () =>
    getDataSource().searchCardsByName(slug),
  );
}

/** Every card illustrated by one artist across all sets (12h TTL). */
export function searchIllustratorCards(artist: string): Promise<CardWithSet[]> {
  const slug = artist.trim().toLowerCase();
  if (isFixtureMode()) return getDataSource().searchCardsByArtist(slug);
  return serverStore.getOrCompute(`illustrator:${slug}`, CARDS_TTL_MS, () =>
    getDataSource().searchCardsByArtist(slug),
  );
}

/** Every print for a generation's dex range (12h TTL). */
export function getPokedexCards(gen: GenerationId): Promise<CardWithSet[]> {
  const range = GENERATIONS.find((g) => g.id === gen);
  if (!range) return Promise.resolve([]);
  if (isFixtureMode()) return getDataSource().getCardsByDexRange(range.min, range.max);
  return serverStore.getOrCompute(`pokedex:${gen}`, CARDS_TTL_MS, () =>
    getDataSource().getCardsByDexRange(range.min, range.max),
  );
}
