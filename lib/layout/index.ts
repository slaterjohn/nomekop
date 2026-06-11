import type { BinderConfig } from "@/lib/config";
import type { TcgCard, TcgSet } from "@/lib/tcg/types";
import { expandSlots, type CollectionMode, type Slot } from "@/lib/layout/expand";
import { paginate, toSpreads, type Page, type Spread } from "@/lib/layout/paginate";

export type { CollectionMode, Slot, Page, Spread };
export { expandSlots, paginate, toSpreads };
export { parseCardNumber, compareCardNumbers, sortCards } from "@/lib/layout/number";

export type BinderLayout = {
  pages: Page[];
  spreads: Spread[];
  stats: {
    /** Distinct cards included after filtering. */
    cards: number;
    /** Card + reverse slots (excludes empty padding). */
    slots: number;
    pages: number;
    slotsPerPage: number;
  };
};

/** The one entry point the preview, print routes and PDF pipeline all share. */
export function buildBinderLayout(
  cards: ReadonlyArray<TcgCard>,
  set: Pick<TcgSet, "printedTotal">,
  config: Pick<BinderConfig, "rows" | "cols" | "mode" | "secrets">,
): BinderLayout {
  const slots = expandSlots(cards, config.mode, config.secrets, set.printedTotal);
  const pages = paginate(slots, config.rows, config.cols);
  const cardIds = new Set<string>();
  for (const s of slots) {
    if (s.kind !== "empty") cardIds.add(s.card.id);
  }
  return {
    pages,
    spreads: toSpreads(pages),
    stats: {
      cards: cardIds.size,
      slots: slots.length,
      pages: pages.length,
      slotsPerPage: config.rows * config.cols,
    },
  };
}
