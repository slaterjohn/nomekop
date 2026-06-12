// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  GENERATIONS,
  buildPokedexEntries,
  decodePokedexToken,
  encodePokedexToken,
  spriteUrl,
} from "@/lib/pokedex";
import type { CardWithSet } from "@/lib/tcg/types";

const card = (over: Partial<CardWithSet>): CardWithSet => ({
  id: "x-1",
  name: "Bulbasaur",
  number: "1",
  rarity: "Common",
  supertype: "Pokémon",
  imageSmall: "",
  imageLarge: "",
  variants: { normal: true, reverse: false, holo: false },
  dex: [1],
  setId: "x",
  setName: "X",
  setReleaseDate: "2020/01/01",
  setPrintedTotal: 100,
  secret: false,
  ...over,
});

describe("generations", () => {
  it("covers the full dex contiguously", () => {
    expect(GENERATIONS[0]).toMatchObject({ id: "g1", min: 1, max: 151 });
    for (let i = 1; i < GENERATIONS.length; i++) {
      expect(GENERATIONS[i]!.min).toBe(GENERATIONS[i - 1]!.max + 1);
    }
    expect(GENERATIONS[GENERATIONS.length - 1]!.max).toBe(1025);
  });
});

describe("pokedex tokens", () => {
  it("encodes gen + grid, omitting empty picks", () => {
    expect(encodePokedexToken({ gen: "g1", rows: 3, cols: 4, picks: {} })).toBe("g1~34");
  });

  it("round-trips picks", () => {
    const token = encodePokedexToken({
      gen: "g1",
      rows: 4,
      cols: 4,
      picks: { 6: "base1-4", 25: "sv1-25" },
    });
    expect(token).toBe("g1~44~6.base1-4_25.sv1-25");
    expect(decodePokedexToken(token)).toEqual({
      gen: "g1",
      rows: 4,
      cols: 4,
      picks: { 6: "base1-4", 25: "sv1-25" },
    });
  });

  it("rejects malformed tokens and out-of-range picks", () => {
    for (const bad of ["", "g0~34", "g1~99", "g1~34~999.base1-4", "g1~34~6.bad/id"]) {
      expect(decodePokedexToken(bad), bad).toBeNull();
    }
  });
});

describe("buildPokedexEntries", () => {
  const cards: CardWithSet[] = [
    card({ id: "old-4", name: "Charizard", dex: [6], rarity: "Rare Holo", setReleaseDate: "1999/01/09" }),
    card({ id: "new-200", name: "Charizard ex", dex: [6], rarity: "Special Illustration Rare", secret: true, setReleaseDate: "2023/03/31" }),
    card({ id: "pika-1", name: "Pikachu", dex: [25], rarity: "Common" }),
  ];

  it("defaults to the secret card when one exists, else the rarest", () => {
    const entries = buildPokedexEntries("g1", cards, {});
    const charizard = entries.find((e) => e.dex === 6)!;
    expect(charizard.chosen?.id).toBe("new-200"); // secret beats non-secret
    const pikachu = entries.find((e) => e.dex === 25)!;
    expect(pikachu.chosen?.id).toBe("pika-1");
    expect(pikachu.alternatives).toHaveLength(1);
  });

  it("covers every dex number in the generation, empty when no card exists", () => {
    const entries = buildPokedexEntries("g1", cards, {});
    expect(entries).toHaveLength(151);
    expect(entries[0]!.dex).toBe(1);
    expect(entries[0]!.chosen).toBeNull(); // no Bulbasaur card in this fixture
  });

  it("applies overrides when the card exists for that dex number", () => {
    const entries = buildPokedexEntries("g1", cards, { 6: "old-4", 25: "nonexistent-1" });
    expect(entries.find((e) => e.dex === 6)!.chosen?.id).toBe("old-4");
    // bogus override falls back to the default pick
    expect(entries.find((e) => e.dex === 25)!.chosen?.id).toBe("pika-1");
  });
});

describe("spriteUrl", () => {
  it("serves gen-viii pixel icons for dex 1-898", () => {
    expect(spriteUrl(25)).toContain("/generation-viii/icons/25.png");
    expect(spriteUrl(898)).toContain("/898.png");
  });

  it("returns null beyond icon coverage (899+) — pokeball fallback", () => {
    expect(spriteUrl(899)).toBeNull();
    expect(spriteUrl(1025)).toBeNull();
  });
});
