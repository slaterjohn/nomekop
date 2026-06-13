// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { CardWithSet } from "@/lib/tcg/types";

// TCGdex + PokéAPI are server-only network modules — mock them so we can test
// the Pokédex localization glue (dex-tagging, pick resolution) hermetically.
const searchByName = vi.fn();
const localizedPokemonName = vi.fn();

vi.mock("@/lib/tcg/tcgdex", () => ({
  searchByName: (...args: unknown[]) => searchByName(...args),
  searchByIllustrator: vi.fn(() => Promise.resolve([])),
}));
vi.mock("@/lib/tcg/pokemon-i18n", () => ({
  localizedPokemonName: (...args: unknown[]) => localizedPokemonName(...args),
}));

import { localizedPrintsByDex, resolvePokedexPickCards } from "@/lib/tcg";

// A TCGdex card as the source delivers it: localized, no National Dex number.
function tcgdexCard(id: string, lang = "ja"): CardWithSet {
  return {
    id,
    name: "リザードンex",
    number: "6",
    rarity: undefined,
    supertype: "Pokémon",
    imageSmall: `https://assets.tcgdex.net/${lang}/SV/SV2a/006/low.webp`,
    imageLarge: `https://assets.tcgdex.net/${lang}/SV/SV2a/006/high.webp`,
    variants: { normal: true, reverse: false, holo: false },
    lang,
    setId: "SV2a",
    setName: "ポケモンカード151",
    setReleaseDate: "2023/06/16",
    setPrintedTotal: 165,
    secret: false,
  };
}

beforeEach(() => {
  vi.stubEnv("TCG_DATA_SOURCE", "live");
  searchByName.mockReset();
  localizedPokemonName.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("localizedPrintsByDex", () => {
  it("stamps the searched dex onto TCGdex cards (which carry none) so they slot", async () => {
    localizedPokemonName.mockResolvedValue("リザードン");
    searchByName.mockResolvedValue([tcgdexCard("SV2a-006"), tcgdexCard("SVK-001")]);

    const cards = await localizedPrintsByDex(6, ["en", "ja"]);

    expect(localizedPokemonName).toHaveBeenCalledWith(6, "ja");
    expect(searchByName).toHaveBeenCalledWith("リザードン", "ja");
    expect(cards).toHaveLength(2);
    // The fix: every returned card now carries dex [6] for pocket placement.
    expect(cards.every((c) => Array.isArray(c.dex) && c.dex[0] === 6)).toBe(true);
    expect(cards[0]!.lang).toBe("ja");
  });

  it("skips the network for English-only requests and in fixture mode", async () => {
    expect(await localizedPrintsByDex(6, ["en"])).toEqual([]);
    vi.stubEnv("TCG_DATA_SOURCE", "fixture");
    expect(await localizedPrintsByDex(6, ["en", "ja"])).toEqual([]);
    expect(searchByName).not.toHaveBeenCalled();
  });

  it("merges several languages, each tagged with the dex", async () => {
    localizedPokemonName.mockImplementation((_dex: number, lang: string) =>
      Promise.resolve(lang === "ja" ? "リザードン" : "Dracaufeu"),
    );
    searchByName.mockImplementation((_name: string, lang: string) =>
      Promise.resolve([tcgdexCard(`x-${lang}`, lang)]),
    );

    const cards = await localizedPrintsByDex(6, ["en", "ja", "fr"]);
    expect(cards.map((c) => c.lang).sort()).toEqual(["fr", "ja"]);
    expect(cards.every((c) => c.dex?.[0] === 6)).toBe(true);
  });
});

describe("resolvePokedexPickCards", () => {
  const english: CardWithSet[] = [
    { ...tcgdexCard("base1-4", "en"), lang: undefined, name: "Charizard" },
  ];

  it("fetches localized prints only for picks not already in the English set", async () => {
    localizedPokemonName.mockResolvedValue("リザードン");
    searchByName.mockResolvedValue([tcgdexCard("SV2a-006")]);

    const extra = await resolvePokedexPickCards(
      { langs: ["en", "ja"], picks: { 4: "base1-4", 6: "SV2a-006" } },
      english,
    );

    // dex 4's pick is an English card already present → not fetched. Only dex 6.
    expect(localizedPokemonName).toHaveBeenCalledTimes(1);
    expect(localizedPokemonName).toHaveBeenCalledWith(6, "ja");
    expect(extra).toHaveLength(1);
    expect(extra[0]!.dex?.[0]).toBe(6);
  });

  it("does nothing when every pick is English, or no non-English language is on", async () => {
    expect(
      await resolvePokedexPickCards({ langs: ["en", "ja"], picks: { 4: "base1-4" } }, english),
    ).toEqual([]);
    expect(
      await resolvePokedexPickCards({ langs: ["en"], picks: { 6: "SV2a-006" } }, english),
    ).toEqual([]);
    expect(searchByName).not.toHaveBeenCalled();
  });
});
