import { describe, it, expect } from "vitest";
import { paginate, toSpreads } from "@/lib/layout/paginate";
import type { Slot } from "@/lib/layout/expand";

const cardSlot = (n: number): Slot => ({
  kind: "card",
  card: {
    id: `c${n}`,
    name: `Card ${n}`,
    number: String(n),
    rarity: "Common",
    supertype: "Pokémon",
    imageSmall: "",
    imageLarge: "",
    variants: { normal: true, reverse: false, holo: false },
  },
});

const slots = (n: number): Slot[] => Array.from({ length: n }, (_, i) => cardSlot(i + 1));

describe("paginate", () => {
  it("pads the final page with empty pockets", () => {
    const pages = paginate(slots(7), 3, 3);
    expect(pages).toHaveLength(1);
    expect(pages[0]!.slots).toHaveLength(9);
    expect(pages[0]!.slots.filter((s) => s.kind === "empty")).toHaveLength(2);
    expect(pages[0]!.number).toBe(1);
  });

  it("splits across pages", () => {
    const pages = paginate(slots(10), 3, 3);
    expect(pages).toHaveLength(2);
    expect(pages[1]!.slots.filter((s) => s.kind === "card")).toHaveLength(1);
    expect(pages[1]!.slots).toHaveLength(9);
  });

  it("exact multiples create no padding page", () => {
    const pages = paginate(slots(18), 3, 3);
    expect(pages).toHaveLength(2);
    expect(pages.flatMap((p) => p.slots).filter((s) => s.kind === "empty")).toHaveLength(0);
  });

  it("zero slots → zero pages", () => {
    expect(paginate([], 3, 3)).toHaveLength(0);
  });

  it("supports 1×1 binders", () => {
    const pages = paginate(slots(3), 1, 1);
    expect(pages).toHaveLength(3);
    expect(pages.every((p) => p.slots.length === 1)).toBe(true);
  });
});

describe("toSpreads", () => {
  it("page 1 sits alone on the right, then facing pairs", () => {
    const pages = paginate(slots(5 * 9), 3, 3); // 5 pages
    const spreads = toSpreads(pages);
    expect(spreads).toHaveLength(3);
    expect(spreads[0]!.left).toBeNull();
    expect(spreads[0]!.right?.number).toBe(1);
    expect(spreads[1]!.left?.number).toBe(2);
    expect(spreads[1]!.right?.number).toBe(3);
    expect(spreads[2]!.left?.number).toBe(4);
    expect(spreads[2]!.right?.number).toBe(5);
  });

  it("even page counts end with a left-only spread", () => {
    const spreads = toSpreads(paginate(slots(2 * 9), 3, 3));
    expect(spreads).toHaveLength(2);
    expect(spreads[1]!.left?.number).toBe(2);
    expect(spreads[1]!.right).toBeNull();
  });

  it("no pages → no spreads", () => {
    expect(toSpreads([])).toEqual([]);
  });
});
