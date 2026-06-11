import { CACHE_TTL_MS, tcgCache } from "@/lib/cache";
import { FixtureSource } from "@/lib/tcg/fixture-source";
import { PokemonTcgIoSource } from "@/lib/tcg/pokemontcgio";
import type { CardDataSource, TcgCard, TcgSet } from "@/lib/tcg/types";

export function getDataSource(): CardDataSource {
  return process.env.TCG_DATA_SOURCE === "fixture" ? new FixtureSource() : new PokemonTcgIoSource();
}

/** Cached sets list (24h TTL, stale-while-revalidate). */
export function getSets(): Promise<TcgSet[]> {
  return tcgCache.getOrCompute("sets", CACHE_TTL_MS, () => getDataSource().getSets());
}

/** Cached card list for one set (24h TTL, stale-while-revalidate). */
export function getCards(setId: string): Promise<TcgCard[]> {
  return tcgCache.getOrCompute(`cards:${setId}`, CACHE_TTL_MS, () => getDataSource().getCards(setId));
}
