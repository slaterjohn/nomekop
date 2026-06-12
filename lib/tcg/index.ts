import { CACHE_TTL_MS, tcgCache } from "@/lib/cache";
import { FixtureSource } from "@/lib/tcg/fixture-source";
import { PokemonTcgIoSource } from "@/lib/tcg/pokemontcgio";
import type { CardDataSource, TcgCard, TcgSet } from "@/lib/tcg/types";

function isFixtureMode(): boolean {
  return process.env.TCG_DATA_SOURCE === "fixture";
}

export function getDataSource(): CardDataSource {
  return isFixtureMode() ? new FixtureSource() : new PokemonTcgIoSource();
}

/** Cached sets list (24h TTL, stale-while-revalidate). Fixture mode reads
 *  straight from disk — caching local JSON only invites staleness. */
export function getSets(): Promise<TcgSet[]> {
  if (isFixtureMode()) return getDataSource().getSets();
  return tcgCache.getOrCompute("sets", CACHE_TTL_MS, () => getDataSource().getSets());
}

/** Cached card list for one set (24h TTL, stale-while-revalidate). */
export function getCards(setId: string): Promise<TcgCard[]> {
  if (isFixtureMode()) return getDataSource().getCards(setId);
  return tcgCache.getOrCompute(`cards:${setId}`, CACHE_TTL_MS, () => getDataSource().getCards(setId));
}
