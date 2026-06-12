import { parseCardNumber, sortCards } from "@/lib/layout/number";
import type { TcgCard } from "@/lib/tcg/types";

export type CollectionMode = "standard" | "master";

export type SlotKind = "card" | "reverse" | "pokeball" | "masterball";

export type Slot = { kind: SlotKind; card: TcgCard } | { kind: "empty" };

export type ExpandOptions = {
  mode: CollectionMode;
  includeSecrets: boolean;
  /** Poké Ball / Master Ball mirror runs (master mode only; no-op for sets without them). */
  includePokeball: boolean;
  includeMasterball: boolean;
  /** Where parallel variants live: beside their card or grouped after the set. */
  placement: "interleave" | "end";
  printedTotal: number;
};

/**
 * Turns a set's cards into the ordered run of binder slots.
 * - standard: one slot per card.
 * - master: parallels follow each card (interleave) or run after the main set
 *   (end): reverse holos always interleave with their card; ball-pattern runs
 *   honour the placement option.
 * - includeSecrets=false keeps only plain numbers within the printed total.
 */
export function expandSlots(cards: ReadonlyArray<TcgCard>, options: ExpandOptions): Slot[] {
  const { mode, includeSecrets, includePokeball, includeMasterball, placement, printedTotal } =
    options;

  const kept = includeSecrets
    ? cards
    : cards.filter((c) => {
        const parsed = parseCardNumber(c.number);
        return parsed !== null && parsed.prefix === "" && parsed.num <= printedTotal;
      });
  const sorted = sortCards(kept);

  const slots: Slot[] = [];
  const reverseRun: Slot[] = [];
  const pokeballRun: Slot[] = [];
  const masterballRun: Slot[] = [];

  for (const card of sorted) {
    slots.push({ kind: "card", card });
    if (mode !== "master") continue;
    if (card.variants.reverse) {
      (placement === "interleave" ? slots : reverseRun).push({ kind: "reverse", card });
    }
    if (includePokeball && card.variants.pokeball) {
      (placement === "interleave" ? slots : pokeballRun).push({ kind: "pokeball", card });
    }
    if (includeMasterball && card.variants.masterball) {
      (placement === "interleave" ? slots : masterballRun).push({ kind: "masterball", card });
    }
  }

  return [...slots, ...reverseRun, ...pokeballRun, ...masterballRun];
}
