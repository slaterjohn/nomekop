import { describe, it, expect } from "vitest";
import { expandSlots, type ExpandOptions, type Slot } from "@/lib/layout/expand";

const opts = (over: Partial<ExpandOptions> = {}): ExpandOptions => ({
  mode: "standard",
  includeSecrets: true,
  includePokeball: true,
  includeMasterball: true,
  placement: "interleave",
  printedTotal: 102,
  ...over,
});
import type { TcgCard } from "@/lib/tcg/types";

const slotNumber = (s: Slot) => (s.kind === "empty" ? undefined : s.card.number);

function card(number: string, opts: Partial<TcgCard> = {}): TcgCard {
  return {
    id: `x-${number}`,
    name: `Card ${number}`,
    number,
    rarity: "Common",
    supertype: "Pokémon",
    imageSmall: "",
    imageLarge: "",
    variants: { normal: true, reverse: false, holo: false },
    ...opts,
  };
}

const reverseCard = (number: string) =>
  card(number, { variants: { normal: true, reverse: true, holo: false } });

describe("expandSlots — standard mode", () => {
  it("emits one card slot per card, sorted by number", () => {
    const slots = expandSlots([card("2"), card("1")], opts({ mode: "standard", includeSecrets: true, printedTotal: 102 }));
    expect(slots.map((s) => ({ kind: s.kind, n: slotNumber(s) }))).toEqual([
      { kind: "card", n: "1" },
      { kind: "card", n: "2" },
    ]);
  });

  it("ignores reverse variants in standard mode", () => {
    const slots = expandSlots([reverseCard("1")], opts({ mode: "standard", includeSecrets: true, printedTotal: 102 }));
    expect(slots).toHaveLength(1);
    expect(slots[0]!.kind).toBe("card");
  });
});

describe("expandSlots — master mode", () => {
  it("interleaves a reverse slot directly after reverse-capable cards", () => {
    const slots = expandSlots([reverseCard("1"), card("2"), reverseCard("3")], opts({ mode: "master", includeSecrets: true, printedTotal: 102 }));
    expect(slots.map((s) => `${s.kind}:${slotNumber(s)}`)).toEqual([
      "card:1",
      "reverse:1",
      "card:2",
      "card:3",
      "reverse:3",
    ]);
  });

  it("reverse slots reference the same card object", () => {
    const slots = expandSlots([reverseCard("1")], opts({ mode: "master", includeSecrets: true, printedTotal: 102 }));
    const [first, second] = slots;
    if (first?.kind === "empty" || second?.kind === "empty") throw new Error("unexpected empty");
    expect(second!.card).toBe(first!.card);
  });
});

describe("expandSlots — secret filtering", () => {
  const cards = [card("1"), card("198"), card("199"), card("250"), card("TG01"), card("85a")];

  it("includeSecrets=true keeps everything", () => {
    const slots = expandSlots(cards, opts({ mode: "standard", includeSecrets: true, printedTotal: 198 }));
    expect(slots).toHaveLength(6);
  });

  it("includeSecrets=false drops numbers beyond printedTotal and prefixed subsets", () => {
    const slots = expandSlots(cards, opts({ mode: "standard", includeSecrets: false, printedTotal: 198 }));
    expect(slots.map(slotNumber)).toEqual(["1", "85a", "198"]);
  });

  it("suffixed numbers within range survive the filter", () => {
    const slots = expandSlots([card("85a")], opts({ mode: "standard", includeSecrets: false, printedTotal: 198 }));
    expect(slots).toHaveLength(1);
  });

  it("unparseable numbers are treated as subset cards (dropped without secrets)", () => {
    const slots = expandSlots([card("PROMO")], opts({ mode: "standard", includeSecrets: false, printedTotal: 198 }));
    expect(slots).toHaveLength(0);
  });
});
