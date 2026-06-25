import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { rarityRank } from "@/lib/tcg/rarity";
import { slugifyArtistName as tsSlugifyArtistName } from "@/lib/illustrator-binder";
import type { TcgCard } from "@/lib/tcg/types";
import {
  SIR_RARITY,
  cardsForDex,
  sirCount,
  illustrationCount,
  distinctArtistCount,
  distinctSetCount,
  earliestSet,
  latestSet,
  signatureCardOf,
  topSpeciesFor,
  slugifyArtistName,
  pokemonStatsFor,
  artistStatsFrom,
} from "../../scripts/entity-compute.mjs";

function fixture(setId: string): TcgCard[] {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), "test", "fixtures", `cards-${setId}.json`), "utf8"),
  );
}

/** A minimal entity card carrying the set-join fields build-entities attaches. */
type ECard = TcgCard & {
  setId: string;
  setName: string;
  setReleaseDate: string;
};
function mk(p: Partial<ECard> & { id: string }): ECard {
  return {
    name: "Card",
    number: "1",
    rarity: "Common",
    supertype: "Pokémon",
    imageSmall: "",
    imageLarge: "",
    variants: { normal: true, reverse: false, holo: false },
    setId: "s1",
    setName: "Set One",
    setReleaseDate: "2020-01-01",
    ...p,
  } as ECard;
}

describe("entity-compute — dex/species precision", () => {
  it("cardsForDex matches a card whose dex array includes the number", () => {
    const cards = [
      mk({ id: "a", name: "Mew", dex: [151] }),
      mk({ id: "b", name: "Mewtwo", dex: [150] }),
    ];
    expect(cardsForDex(cards, 151).map((c: ECard) => c.id)).toEqual(["a"]);
  });

  it("cardsForDex excludes Mewtwo from Mew (the substring-binder bug)", () => {
    const cards = [mk({ id: "mew", name: "Mew", dex: [151] }), mk({ id: "two", name: "Mewtwo", dex: [150] })];
    expect(cardsForDex(cards, 151).some((c: ECard) => c.name === "Mewtwo")).toBe(false);
  });

  it("cardsForDex counts a multi-dex card under each of its species", () => {
    const dual = mk({ id: "dual", name: "Charizard & Reshiram GX", dex: [6, 643] });
    const cards = [dual, mk({ id: "x", name: "Pikachu", dex: [25] })];
    expect(cardsForDex(cards, 6).map((c: ECard) => c.id)).toEqual(["dual"]);
    expect(cardsForDex(cards, 643).map((c: ECard) => c.id)).toEqual(["dual"]);
  });

  it("cardsForDex excludes cards with no dex (Trainers/Energy)", () => {
    const cards = [mk({ id: "t", name: "Potion", supertype: "Trainer" })];
    expect(cardsForDex(cards, 25)).toEqual([]);
  });
});

describe("entity-compute — rarity counts (real sv8pt5 fixture)", () => {
  it("sirCount counts Special Illustration Rares case-insensitively (32 in sv8pt5)", () => {
    expect(sirCount(fixture("sv8pt5"))).toBe(32);
  });

  it("illustrationCount is a superset of SIRs", () => {
    const cards = fixture("sv8pt5");
    expect(illustrationCount(cards)).toBeGreaterThanOrEqual(sirCount(cards));
  });
});

describe("entity-compute — distinct counts & set range", () => {
  it("distinctArtistCount ignores blanks and de-dupes", () => {
    const cards = [
      mk({ id: "a", artist: "Mitsuhiro Arita" }),
      mk({ id: "b", artist: "Mitsuhiro Arita" }),
      mk({ id: "c", artist: "Ken Sugimori" }),
      mk({ id: "d" }),
    ];
    expect(distinctArtistCount(cards)).toBe(2);
  });

  it("distinctSetCount counts unique set ids", () => {
    const cards = [mk({ id: "a", setId: "base1" }), mk({ id: "b", setId: "base1" }), mk({ id: "c", setId: "sv1" })];
    expect(distinctSetCount(cards)).toBe(2);
  });

  it("earliestSet / latestSet pick by release date", () => {
    const cards = [
      mk({ id: "a", setId: "base1", setName: "Base", setReleaseDate: "1999-01-09" }),
      mk({ id: "b", setId: "sv1", setName: "Scarlet & Violet", setReleaseDate: "2023-03-31" }),
    ];
    expect(earliestSet(cards)).toEqual({ id: "base1", name: "Base", releaseDate: "1999-01-09" });
    expect(latestSet(cards)).toEqual({ id: "sv1", name: "Scarlet & Violet", releaseDate: "2023-03-31" });
  });
});

describe("entity-compute — signature card", () => {
  it("prefers the highest market price", () => {
    const cards = [
      mk({ id: "cheap", rarity: "Common", tcgplayer: { prices: { normal: { market: 1 } } } }),
      mk({ id: "chase", rarity: "Common", tcgplayer: { prices: { holofoil: { market: 500 } } } }),
    ];
    expect(signatureCardOf(cards)?.id).toBe("chase");
  });

  it("falls back to the rarest card when nothing is priced", () => {
    const cards = [
      mk({ id: "common", rarity: "Common" }),
      mk({ id: "sir", rarity: SIR_RARITY }),
    ];
    expect(signatureCardOf(cards)?.id).toBe("sir");
  });
});

/** dex → canonical species name/slug, as build-entities supplies from
 *  data/pokemon-names.json. */
const NAMES = new Map<number, { name: string; slug: string }>([
  [6, { name: "Charizard", slug: "charizard" }],
  [25, { name: "Pikachu", slug: "pikachu" }],
  [151, { name: "Mew", slug: "mew" }],
]);

describe("entity-compute — top species (for an artist)", () => {
  it("groups by dex (so 'Dark Charizard' counts as Charizard) and ranks by count", () => {
    const cards = [
      mk({ id: "1", name: "Charizard", dex: [6] }),
      mk({ id: "2", name: "Charizard ex", dex: [6] }),
      mk({ id: "3", name: "Dark Charizard", dex: [6] }),
      mk({ id: "4", name: "Pikachu", dex: [25] }),
    ];
    const top = topSpeciesFor(cards, 5, NAMES);
    expect(top[0]).toEqual({ slug: "charizard", name: "Charizard", count: 3 });
    expect(top[1]).toEqual({ slug: "pikachu", name: "Pikachu", count: 1 });
  });
});

describe("entity-compute — assemblers", () => {
  it("pokemonStatsFor assembles the species entity", () => {
    const cards = [
      mk({ id: "p1", name: "Pikachu", dex: [25], rarity: "Common", artist: "Atsuko Nishida", setId: "base1", setName: "Base", setReleaseDate: "1999-01-09" }),
      mk({ id: "p2", name: "Pikachu ex", dex: [25], rarity: SIR_RARITY, artist: "Akira Komayama", setId: "sv1", setName: "Scarlet & Violet", setReleaseDate: "2023-03-31" }),
    ];
    const e = pokemonStatsFor({ dex: 25, name: "Pikachu", slug: "pikachu" }, cards);
    expect(e.dex).toBe(25);
    expect(e.cardCount).toBe(2);
    expect(e.sirCount).toBe(1);
    expect(e.artistCount).toBe(2);
    expect(e.setCount).toBe(2);
    expect(e.firstSet!.id).toBe("base1");
    expect(e.latestSet!.id).toBe("sv1");
    expect(e.signatureCard!.id).toBe("p2"); // SIR beats common when unpriced
  });

  it("artistStatsFrom gates by threshold but indexes everyone", () => {
    const big = Array.from({ length: 5 }, (_, i) =>
      mk({ id: `a${i}`, name: "Charizard", dex: [6], artist: "Mitsuhiro Arita", setId: i < 3 ? "base1" : "sv1", setReleaseDate: i < 3 ? "1999-01-09" : "2023-03-31" }),
    );
    const small = [mk({ id: "s0", name: "Pikachu", dex: [25], artist: "Tiny Artist" })];
    const { artists, artistIndex } = artistStatsFrom([...big, ...small], 5, NAMES);
    expect(artists.map((a: { slug: string }) => a.slug)).toEqual(["mitsuhiro-arita"]);
    const arita = artists[0]!;
    expect(arita.cardCount).toBe(5);
    expect(arita.setCount).toBe(2);
    expect(arita.topPokemon[0]).toEqual({ slug: "charizard", name: "Charizard", count: 5 });
    // everyone (incl. below-threshold) appears in the linking index
    expect(artistIndex.find((a: { slug: string }) => a.slug === "tiny-artist")?.cardCount).toBe(1);
    expect(artistIndex.find((a: { slug: string }) => a.slug === "mitsuhiro-arita")?.cardCount).toBe(5);
  });
});

describe("entity-compute — guards against app drift", () => {
  it("slugifyArtistName matches the app's illustrator-binder slug", () => {
    for (const name of ["Mitsuhiro Arita", "5ban Graphics", "Ken Sugimori", "PLANETA Mochizuki"]) {
      expect(slugifyArtistName(name)).toBe(tsSlugifyArtistName(name));
    }
  });

  it("SIR_RARITY is a real rarity ranked above plain Illustration Rare", () => {
    expect(rarityRank(SIR_RARITY)).toBeGreaterThan(rarityRank("Illustration Rare"));
    expect(rarityRank(SIR_RARITY)).toBeGreaterThan(0);
  });
});
