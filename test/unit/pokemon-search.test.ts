import { describe, it, expect } from "vitest";
import {
  POKEMON_NAMES,
  fuzzyMatchPokemon,
  suggestSimilarPokemon,
} from "@/lib/pokemon-search";

describe("pokemon name dataset", () => {
  it("covers the full National Dex with token-legal slugs", () => {
    expect(POKEMON_NAMES.length).toBe(1025);
    expect(POKEMON_NAMES[0]).toMatchObject({ dex: 1, name: "Bulbasaur" });
    // Every slug must be a legal /pokemon token name part.
    const legal = /^[a-z0-9.':♀♂é -]{1,40}$/;
    for (const p of POKEMON_NAMES) expect(p.slug).toMatch(legal);
  });
});

describe("fuzzyMatchPokemon (typeahead)", () => {
  it("ranks an exact name first", () => {
    expect(fuzzyMatchPokemon("charizard")[0]?.name).toBe("Charizard");
  });

  it("matches a prefix as you type", () => {
    const names = fuzzyMatchPokemon("char").map((p) => p.name);
    expect(names).toContain("Charizard");
    expect(names).toContain("Charmander");
  });

  it("is accent- and punctuation-insensitive", () => {
    expect(fuzzyMatchPokemon("flabebe")[0]?.name).toBe("Flabébé");
    expect(fuzzyMatchPokemon("mr mime")[0]?.name).toBe("Mr. Mime");
    expect(fuzzyMatchPokemon("hooh")[0]?.name).toBe("Ho-Oh");
  });

  it("matches an interior word (Tapu Koko by 'koko')", () => {
    expect(fuzzyMatchPokemon("koko").map((p) => p.name)).toContain("Tapu Koko");
  });

  it("returns nothing for an empty query and respects the limit", () => {
    expect(fuzzyMatchPokemon("")).toEqual([]);
    expect(fuzzyMatchPokemon("a", 5).length).toBeLessThanOrEqual(5);
  });
});

describe("suggestSimilarPokemon (no-results 'did you mean')", () => {
  it("recovers from a typo", () => {
    expect(suggestSimilarPokemon("charizrd").map((p) => p.name)).toContain("Charizard");
    expect(suggestSimilarPokemon("picachu").map((p) => p.name)).toContain("Pikachu");
  });

  it("drops the exact match (it would have had cards) and caps the count", () => {
    const sugg = suggestSimilarPokemon("pikachu", 6);
    expect(sugg.find((p) => p.name === "Pikachu")).toBeUndefined();
    expect(sugg.length).toBeLessThanOrEqual(6);
  });

  it("returns nothing for gibberish", () => {
    expect(suggestSimilarPokemon("zzzzqqqqxxxx")).toEqual([]);
  });
});
