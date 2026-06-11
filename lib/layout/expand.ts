import { parseCardNumber, sortCards } from "@/lib/layout/number";
import type { TcgCard } from "@/lib/tcg/types";

export type CollectionMode = "standard" | "master";

export type Slot =
  | { kind: "card"; card: TcgCard }
  | { kind: "reverse"; card: TcgCard }
  | { kind: "empty" };

/**
 * Turns a set's cards into the ordered run of binder slots.
 * - standard: one slot per card.
 * - master: reverse-capable cards are followed by their reverse-holo slot
 *   (the "interleaved parallel set").
 * - includeSecrets=false keeps only plain numbers within the printed total.
 */
export function expandSlots(
  cards: ReadonlyArray<TcgCard>,
  mode: CollectionMode,
  includeSecrets: boolean,
  printedTotal: number,
): Slot[] {
  const kept = includeSecrets
    ? cards
    : cards.filter((c) => {
        const parsed = parseCardNumber(c.number);
        return parsed !== null && parsed.prefix === "" && parsed.num <= printedTotal;
      });

  const slots: Slot[] = [];
  for (const card of sortCards(kept)) {
    slots.push({ kind: "card", card });
    if (mode === "master" && card.variants.reverse) {
      slots.push({ kind: "reverse", card });
    }
  }
  return slots;
}
