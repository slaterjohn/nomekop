import { describe, it, expect } from "vitest";
import { toCollectionCsv } from "@/lib/csv";
import type { Slot } from "@/lib/layout/expand";
import type { TcgCard } from "@/lib/tcg/types";

const card = (number: string, name: string, rarity?: string): TcgCard => ({
  id: `x-${number}`,
  name,
  number,
  rarity,
  supertype: "Pokémon",
  imageSmall: "",
  imageLarge: "",
  variants: { normal: true, reverse: true, holo: false },
});

const slots: Slot[] = [
  { kind: "card", card: card("1", "Pineco", "Common") },
  { kind: "reverse", card: card("1", "Pineco", "Common") },
  { kind: "pokeball", card: card("1", "Pineco", "Common") },
  { kind: "card", card: card("2", 'Mr. "Mime"') },
  { kind: "empty" },
];

describe("toCollectionCsv", () => {
  it("emits a header plus one row per pocket with collected state", () => {
    const csv = toCollectionCsv(slots, new Set(["x-1:card", "x-1:pokeball"]));
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("number,name,rarity,variant,collected");
    expect(lines[1]).toBe("1,Pineco,Common,Normal,yes");
    expect(lines[2]).toBe("1,Pineco,Common,Reverse holo,no");
    expect(lines[3]).toBe("1,Pineco,Common,Poké Ball,yes");
    expect(lines).toHaveLength(5); // header + 4 pockets (empty skipped)
  });

  it("escapes quotes and commas per RFC 4180", () => {
    const csv = toCollectionCsv(slots, new Set());
    expect(csv).toContain('2,"Mr. ""Mime""",,Normal,no');
  });
});
