import { notFound } from "next/navigation";
import { parseConfig, type BinderConfig } from "@/lib/config";
import { getCards, getSets } from "@/lib/tcg";
import type { TcgCard, TcgSet } from "@/lib/tcg/types";

export type PrintData = {
  config: BinderConfig;
  set: TcgSet;
  cards: TcgCard[];
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Shared loader for all print routes: config + set + cards or 404. */
export async function loadPrintData(searchParams: SearchParams): Promise<PrintData> {
  const config = parseConfig(await searchParams);
  if (!config.set) notFound();
  const [sets, cards] = await Promise.all([getSets(), getCards(config.set)]);
  const set = sets.find((s) => s.id === config.set);
  if (!set || cards.length === 0) notFound();
  return { config, set, cards };
}
