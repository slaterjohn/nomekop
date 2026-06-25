import { describe, expect, it } from "vitest";
import { pokemonFaqEntries } from "@/lib/content/entities/faq";
import type { PokemonEntity } from "@/lib/content/entities/types";

function entity(overrides: Partial<PokemonEntity> = {}): PokemonEntity {
  return {
    dex: 25,
    slug: "pikachu",
    name: "Pikachu",
    cardCount: 177,
    sirCount: 3,
    illustrationRareCount: 4,
    artistCount: 69,
    setCount: 88,
    firstSet: { id: "base1", name: "Base", releaseDate: "1999-01-09" },
    latestSet: { id: "me2pt5", name: "Ascended Heroes", releaseDate: "2026-01-30" },
    rarities: { Common: 50, "Rare Holo": 20 },
    signatureCard: {
      id: "ex13-104",
      name: "Pikachu",
      number: "104",
      rarity: "Rare Holo",
      marketPrice: 312.5,
      imageSmall: "https://img/ex13-104.png",
    },
    ...overrides,
  };
}

describe("pokemonFaqEntries", () => {
  it("always answers how many cards, with the real counts", () => {
    const entries = pokemonFaqEntries(entity());
    const count = entries.find((e) => /how many pikachu cards/i.test(e.question))!;
    expect(count).toBeDefined();
    expect(count.answer).toContain("177");
    expect(count.answer).toContain("88");
  });

  it("leads with the value question when the signature card is priced", () => {
    const entries = pokemonFaqEntries(entity());
    expect(entries[0]!.question).toMatch(/valuable|worth/i);
    expect(entries[0]!.answer).toContain("312"); // the market price
  });

  it("omits the value question when nothing is priced", () => {
    const entries = pokemonFaqEntries(
      entity({ signatureCard: { id: "x", name: "Pikachu", number: "1", rarity: "Common" } }),
    );
    expect(entries.some((e) => /valuable|worth/i.test(e.question))).toBe(false);
  });

  it("includes a Special Illustration Rare question only when there are SIRs", () => {
    expect(pokemonFaqEntries(entity()).some((e) => /special illustration rare/i.test(e.question))).toBe(true);
    expect(pokemonFaqEntries(entity({ sirCount: 0 })).some((e) => /special illustration rare/i.test(e.question))).toBe(
      false,
    );
  });

  it("answers when the first card appeared", () => {
    const first = pokemonFaqEntries(entity()).find((e) => /first pikachu card/i.test(e.question))!;
    expect(first).toBeDefined();
    expect(first.answer).toContain("1999");
    expect(first.answer).toMatch(/Base Set/); // "Base" is rendered as "Base Set"
  });

  it("produces no empty questions or answers", () => {
    for (const e of pokemonFaqEntries(entity())) {
      expect(e.question.trim().length).toBeGreaterThan(0);
      expect(e.answer.trim().length).toBeGreaterThan(0);
    }
  });
});
