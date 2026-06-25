import { describe, expect, it } from "vitest";
import { pokemonFaqEntries, artistFaqEntries } from "@/lib/content/entities/faq";
import type { ArtistEntity, PokemonEntity } from "@/lib/content/entities/types";

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

function artist(overrides: Partial<ArtistEntity> = {}): ArtistEntity {
  return {
    slug: "mitsuhiro-arita",
    name: "Mitsuhiro Arita",
    cardCount: 728,
    setCount: 130,
    illustrationCount: 12,
    earliestSet: { id: "base1", name: "Base", releaseDate: "1999-01-09" },
    latestSet: { id: "sv7", name: "Stellar Crown", releaseDate: "2024-09-13" },
    topPokemon: [
      { slug: "charizard", name: "Charizard", count: 9 },
      { slug: "gyarados", name: "Gyarados", count: 9 },
    ],
    signatureCard: {
      id: "base1-4",
      name: "Charizard",
      number: "4",
      rarity: "Rare Holo",
      marketPrice: 420,
      imageSmall: "https://img/base1-4.png",
    },
    ...overrides,
  };
}

describe("artistFaqEntries", () => {
  it("answers how many cards across how many sets", () => {
    const e = artistFaqEntries(artist()).find((x) => /how many cards has mitsuhiro arita/i.test(x.question))!;
    expect(e).toBeDefined();
    expect(e.answer).toContain("728");
    expect(e.answer).toContain("130");
  });

  it("names the most-illustrated Pokémon", () => {
    const e = artistFaqEntries(artist()).find((x) => /which pok.mon/i.test(x.question))!;
    expect(e.answer).toContain("Charizard");
    expect(e.answer).toContain("9");
  });

  it("leads with the value question when the signature card is priced", () => {
    expect(artistFaqEntries(artist())[0]!.question).toMatch(/valuable|worth/i);
    expect(artistFaqEntries(artist())[0]!.answer).toContain("420");
  });

  it("answers when they started", () => {
    const e = artistFaqEntries(artist()).find((x) => /first/i.test(x.question))!;
    expect(e.answer).toMatch(/Base Set/);
    expect(e.answer).toContain("1999");
  });

  it("produces no empty questions or answers", () => {
    for (const e of artistFaqEntries(artist())) {
      expect(e.question.trim().length).toBeGreaterThan(0);
      expect(e.answer.trim().length).toBeGreaterThan(0);
    }
  });
});
