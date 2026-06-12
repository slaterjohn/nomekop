import { CARDS_TTL_MS, SETS_TTL_MS, serverStore } from "@/lib/server-store";
import { FixtureSource } from "@/lib/tcg/fixture-source";
import { PokemonTcgIoSource } from "@/lib/tcg/pokemontcgio";
import type { CardDataSource, TcgCard, TcgSet } from "@/lib/tcg/types";

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
