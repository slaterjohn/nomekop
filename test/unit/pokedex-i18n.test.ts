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

import { getLocalizedPokedexCards, localizedPrintsByDex } from "@/lib/tcg";

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
  // These functions exercise the multi-language card feature, which is gated
  // behind NEXT_PUBLIC_CARD_LANGUAGES — enable it here; the "feature gate" block
  // below covers the off path.
  vi.stubEnv("NEXT_PUBLIC_CARD_LANGUAGES", "1");
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

describe("getLocalizedPokedexCards", () => {
  it("never touches the network for English or in fixture mode", async () => {
    expect(await getLocalizedPokedexCards("g1", "en")).toEqual([]);
    vi.stubEnv("TCG_DATA_SOURCE", "fixture");
    expect(await getLocalizedPokedexCards("g1", "ja")).toEqual([]);
    expect(searchByName).not.toHaveBeenCalled();
    expect(localizedPokemonName).not.toHaveBeenCalled();
  });
});

describe("feature gate (NEXT_PUBLIC_CARD_LANGUAGES off)", () => {
  it("returns no localized cards and skips the network when the flag is off", async () => {
    vi.stubEnv("NEXT_PUBLIC_CARD_LANGUAGES", "0");
    localizedPokemonName.mockResolvedValue("リザードン");
    searchByName.mockResolvedValue([tcgdexCard("SV2a-006")]);

    expect(await localizedPrintsByDex(6, ["en", "ja"])).toEqual([]);
    expect(await getLocalizedPokedexCards("g1", "ja")).toEqual([]);
    expect(searchByName).not.toHaveBeenCalled();
    expect(localizedPokemonName).not.toHaveBeenCalled();
  });
});
