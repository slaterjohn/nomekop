import type { Slot } from "@/lib/layout/expand";

export type Page = {
  /** 1-based binder page number. */
  number: number;
  /** Always exactly rows × cols entries; trailing pockets are 'empty'. */
  slots: Slot[];
};

export type Spread = {
  left: Page | null;
  right: Page | null;
};

/** Fills slots left→right, top→bottom into rows×cols pages, padding the last. */
export function paginate(slots: ReadonlyArray<Slot>, rows: number, cols: number): Page[] {
  const perPage = rows * cols;
  const pages: Page[] = [];
  for (let i = 0; i < slots.length; i += perPage) {
    const pageSlots: Slot[] = slots.slice(i, i + perPage);
    while (pageSlots.length < perPage) pageSlots.push({ kind: "empty" });
    pages.push({ number: pages.length + 1, slots: pageSlots });
  }
  return pages;
}

/**
 * Groups pages the way an open binder shows them: page 1 faces you alone on
 * the right; after that, even pages sit left and odd pages right.
 */
export function toSpreads(pages: ReadonlyArray<Page>): Spread[] {
  if (pages.length === 0) return [];
  const spreads: Spread[] = [{ left: null, right: pages[0]! }];
  for (let i = 1; i < pages.length; i += 2) {
    spreads.push({ left: pages[i]!, right: pages[i + 1] ?? null });
  }
  return spreads;
}
