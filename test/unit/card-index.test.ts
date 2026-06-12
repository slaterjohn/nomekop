// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";
import { SqliteStore } from "@/lib/server-store";
import {
  getCardIndex,
  searchNameInIndex,
  searchArtistInIndex,
  dexRangeInIndex,
  normalizeQuery,
} from "@/lib/tcg/card-index";
import type { TcgCard, TcgSet } from "@/lib/tcg/types";

const LONG = 1_000_000;

const mkSet = (id: string, printedTotal = 102): TcgSet => ({
  id,
  name: id.toUpperCase(),
  series: "Test",
  printedTotal,
  total: printedTotal,
  releaseDate: "1999/01/09",
  symbolUrl: "",
  logoUrl: "",
});

const mkCard = (name: string, number: string, extra: Partial<TcgCard> = {}): TcgCard => ({
  id: `${name}-${number}`,
  name,
  number,
  rarity: "Rare",
  supertype: "Pokémon",
  imageSmall: "",
  imageLarge: "",
  variants: { normal: true, reverse: false, holo: false },
  ...extra,
});

let store: SqliteStore;
afterEach(() => store?.close());

function seed(): SqliteStore {
  const s = new SqliteStore(":memory:");
  s.set("sets", [mkSet("base1"), mkSet("base2")], LONG);
  s.set(
    "cards:base1",
    [
      mkCard("Charizard", "4", { dex: [6], artist: "Mitsuhiro Arita" }),
      mkCard("Dark Charizard", "21", { dex: [6], artist: "Ken Sugimori" }),
      mkCard("Pikachu", "58", { dex: [25], artist: "Atsuko Nishida" }),
      mkCard("Charizard", "103", { dex: [6], artist: "Mitsuhiro Arita" }), // secret (>102)
    ],
    LONG,
  );
  s.set("cards:base2", [mkCard("Mewtwo", "10", { dex: [150], artist: "Ken Sugimori" })], LONG);
  return s;
}

describe("card index", () => {
  it("unions every cached set's cards with set context + secret flag", () => {
    store = seed();
    const index = getCardIndex(store);
    expect(index.setCount).toBe(2);
    expect(index.cards).toHaveLength(5);
    const secret = index.cards.find((c) => c.number === "103")!;
    expect(secret.secret).toBe(true);
    expect(secret.setId).toBe("base1");
    expect(index.cards.find((c) => c.number === "4")!.secret).toBe(false);
  });

  it("name search is fuzzy: 'charizard' matches Charizard and Dark Charizard", () => {
    store = seed();
    const hits = searchNameInIndex("charizard", getCardIndex(store));
    expect(hits.map((c) => c.name).sort()).toEqual(["Charizard", "Charizard", "Dark Charizard"]);
    expect(searchNameInIndex("pikachu", getCardIndex(store))).toHaveLength(1);
    expect(searchNameInIndex("nidoking", getCardIndex(store))).toHaveLength(0);
  });

  it("artist search spans sets", () => {
    store = seed();
    const hits = searchArtistInIndex("ken-sugimori", getCardIndex(store));
    expect(hits.map((c) => c.name).sort()).toEqual(["Dark Charizard", "Mewtwo"]);
  });

  it("dex range selects by National Dex number", () => {
    store = seed();
    expect(dexRangeInIndex(1, 50, getCardIndex(store)).every((c) => c.dex?.[0] === 6 || c.dex?.[0] === 25)).toBe(
      true,
    );
    expect(dexRangeInIndex(150, 151, getCardIndex(store)).map((c) => c.name)).toEqual(["Mewtwo"]);
  });

  it("skips sets whose cards are not cached yet (partial index)", () => {
    store = new SqliteStore(":memory:");
    store.set("sets", [mkSet("base1"), mkSet("base2")], LONG);
    store.set("cards:base1", [mkCard("Charizard", "4", { dex: [6] })], LONG);
    // base2 cards not cached
    expect(getCardIndex(store).setCount).toBe(1);
  });

  it("normalizeQuery strips separators and case", () => {
    expect(normalizeQuery("Ho-Oh")).toBe("hooh");
    expect(normalizeQuery("Mr. Mime")).toBe("mrmime");
  });
});
