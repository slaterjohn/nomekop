import type { CardWithSet, TcgCard, TcgSet } from "@/lib/tcg/types";

/**
 * A card's number sits beyond the printed set (a secret rare) or in a lettered
 * subset (TG/GG/SV…). Shared by the live API mapper and the derived card index
 * so both label "secret" identically.
 */
export function isSecretNumber(number: string, printedTotal: number): boolean {
  const m = /^([A-Za-z]*)(\d+)([a-z]*)$/.exec(number);
  if (!m) return true; // unparseable → subset/promo numbering
  if (m[1] !== "") return true; // lettered subset (TG/GG/SV…)
  return Number.parseInt(m[2]!, 10) > printedTotal;
}

/**
 * Re-attach set context to a bare card. Used when deriving cross-set views
 * (Pokémon / illustrator / Pokédex binders) from the cached per-set card lists
 * instead of querying the API for each entity.
 */
export function toCardWithSet(card: TcgCard, set: TcgSet): CardWithSet {
  return {
    ...card,
    setId: set.id,
    setName: set.name,
    setReleaseDate: set.releaseDate,
    setPrintedTotal: set.printedTotal,
    secret: isSecretNumber(card.number, set.printedTotal),
  };
}
