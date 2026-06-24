import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { rarityRank } from "@/lib/tcg/rarity";
import { expandSlots } from "@/lib/layout";
import type { TcgCard } from "@/lib/tcg/types";
import {
  masterSlotCount,
  rarestOf,
  marketPriceOf,
  mostValuableOf,
  chaseOf,
  marqueePokemonOf,
  RARITY_ORDER,
} from "../../scripts/faq-compute.mjs";

function fixture(setId: string): TcgCard[] {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), "test", "fixtures", `cards-${setId}.json`), "utf8"),
  );
}

describe("faq-compute matches the app's authoritative logic", () => {
  it("master slot count equals expandSlots master-mode length (sv8pt5, has ball patterns)", () => {
    const cards = fixture("sv8pt5");
    const real = expandSlots(cards, {
      mode: "master",
      includeSecrets: true,
      includePokeball: true,
      includeMasterball: true,
      includeEnergy: true,
      placement: "interleave",
      printedTotal: 131,
    }).length;
    expect(masterSlotCount(cards)).toBe(real);
    expect(masterSlotCount(cards)).toBe(447);
  });

  it("RARITY_ORDER ranks identically to the app's rarityRank", () => {
    for (const name of RARITY_ORDER) {
      const local = RARITY_ORDER.indexOf(name) + 1;
      expect(local).toBe(rarityRank(name));
    }
  });

  it("rarest card has the highest rarity rank in the set", () => {
    const cards = fixture("sv8pt5");
    const rarest = rarestOf(cards);
    const maxRank = Math.max(...cards.map((c) => rarityRank(c.rarity)));
    expect(rarityRank(rarest.rarity)).toBe(maxRank);
  });

  it("most valuable card is the highest market price (Umbreon ex #161 in sv8pt5)", () => {
    const valuable = mostValuableOf(fixture("sv8pt5"));
    expect(valuable?.number).toBe("161");
    expect(valuable?.name).toMatch(/Umbreon/);
  });

  it("marketPriceOf returns undefined when a card has no prices", () => {
    expect(marketPriceOf({ tcgplayer: undefined })).toBeUndefined();
  });

  it("marquee Pokémon are deduped by base species and capped", () => {
    const marquee = marqueePokemonOf(fixture("sv8pt5"), 5);
    expect(marquee.length).toBeLessThanOrEqual(5);
    const slugs = marquee.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(marquee.every((m) => m.cards.length >= 1)).toBe(true);
  });

  it("chaseOf returns distinct cards ranked by rarity", () => {
    const chase = chaseOf(fixture("sv8pt5"), 6);
    expect(chase.length).toBe(6);
    expect(new Set(chase.map((c) => c.id)).size).toBe(6);
  });

  it("surfaces the set's real chase cards by desirability (price-led)", () => {
    // Prismatic Evolutions' iconic, most-valuable card is Umbreon ex (#161,
    // ~$1,580) — a Special Illustration Rare, not one of the gold Hyper Rares.
    // Selection must lead with desirability so this card isn't dropped.
    const marquee = marqueePokemonOf(fixture("sv8pt5"), 5);
    expect(marquee.some((m) => m.slug === "umbreon")).toBe(true);

    const chase = chaseOf(fixture("sv8pt5"), 6);
    const top = chase[0]!;
    expect(top.name).toMatch(/Umbreon/);
  });
});
