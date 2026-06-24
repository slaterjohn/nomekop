import type { BinderConfig } from "@/lib/config";
import type { TcgCard, TcgSet } from "@/lib/tcg/types";
import {
  expandSlots,
  type CollectionMode,
  type ExpandOptions,
  type Slot,
  type SlotKind,
} from "@/lib/layout/expand";
import { paginate, toSpreads, type Page, type Spread } from "@/lib/layout/paginate";

export type { CollectionMode, ExpandOptions, Slot, SlotKind, Page, Spread };
export { expandSlots, paginate, toSpreads };
export { parseCardNumber, compareCardNumbers, sortCards } from "@/lib/layout/number";

export type BinderLayout = {
  pages: Page[];
  spreads: Spread[];
  stats: {
    /** Distinct cards included after filtering. */
    cards: number;
    /** Card + variant slots (excludes empty padding). */
    slots: number;
    pages: number;
    slotsPerPage: number;
    rows: number;
    cols: number;
    /** Pocket counts per print kind (normal cards under 'card'). */
    byKind: Record<SlotKind, number>;
  };
};

/** Bridges BinderConfig to the engine's expansion options. */
export function expandOptionsFrom(
  config: Pick<BinderConfig, "mode" | "secrets" | "pb" | "mb" | "ep" | "place">,
  set: Pick<TcgSet, "printedTotal">,
): ExpandOptions {
  return {
    mode: config.mode,
    includeSecrets: config.secrets,
    includePokeball: config.pb,
    includeMasterball: config.mb,
    includeEnergy: config.ep,
    placement: config.place === "end" ? "end" : "interleave",
    printedTotal: set.printedTotal,
  };
}

/** The one entry point the preview, print routes and PDF pipeline all share. */
export function buildBinderLayout(
  cards: ReadonlyArray<TcgCard>,
  set: Pick<TcgSet, "printedTotal">,
  config: Pick<BinderConfig, "rows" | "cols" | "mode" | "secrets" | "pb" | "mb" | "ep" | "place">,
): BinderLayout {
  const slots = expandSlots(cards, expandOptionsFrom(config, set));
  const pages = paginate(slots, config.rows, config.cols);
  const cardIds = new Set<string>();
  const byKind: Record<SlotKind, number> = {
    card: 0,
    reverse: 0,
    pokeball: 0,
    masterball: 0,
    energy: 0,
  };
  for (const s of slots) {
    if (s.kind !== "empty") {
      cardIds.add(s.card.id);
      byKind[s.kind] += 1;
    }
  }
  return {
    pages,
    spreads: toSpreads(pages),
    stats: {
      cards: cardIds.size,
      slots: slots.length,
      pages: pages.length,
      slotsPerPage: config.rows * config.cols,
      rows: config.rows,
      cols: config.cols,
      byKind,
    },
  };
}
