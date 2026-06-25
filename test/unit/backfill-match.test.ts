import { describe, expect, it } from "vitest";
import { normalizeCardNumber, matchArtistsByNumber } from "../../scripts/backfill-match.mjs";

describe("normalizeCardNumber", () => {
  it("strips leading zeros so pokemontcg.io '1' matches TCGdex '001'", () => {
    expect(normalizeCardNumber("001")).toBe(normalizeCardNumber("1"));
  });

  it("keeps a letter prefix but normalises its digits ('SV001' ~ 'SV1')", () => {
    expect(normalizeCardNumber("SV001")).toBe(normalizeCardNumber("SV1"));
    expect(normalizeCardNumber("TG01")).toBe(normalizeCardNumber("tg1"));
  });

  it("distinguishes a prefixed number from a bare one (TG1 ≠ 1)", () => {
    expect(normalizeCardNumber("TG01")).not.toBe(normalizeCardNumber("1"));
  });

  it("preserves secret numbers beyond the printed total", () => {
    expect(normalizeCardNumber("191")).toBe("191");
  });
});

describe("matchArtistsByNumber", () => {
  const tcgdex = [
    { localId: "001", illustrator: "Tetsu Kayama" },
    { localId: "191", illustrator: "Mitsuhiro Arita" },
    { localId: "252", illustrator: undefined }, // Energy card, no illustrator
  ];

  it("maps a pokemontcg.io card id to the illustrator matched by number", () => {
    const ptcg = [
      { id: "sv8-1", number: "1" },
      { id: "sv8-191", number: "191" },
    ];
    const { overrides } = matchArtistsByNumber(ptcg, tcgdex);
    expect(overrides).toEqual({ "sv8-1": "Tetsu Kayama", "sv8-191": "Mitsuhiro Arita" });
  });

  it("reports cards with no TCGdex match or no illustrator as unmatched", () => {
    const ptcg = [
      { id: "sv8-252", number: "252" }, // tcgdex has it but no illustrator
      { id: "sv8-999", number: "999" }, // not in tcgdex at all
    ];
    const { overrides, unmatched } = matchArtistsByNumber(ptcg, tcgdex);
    expect(overrides).toEqual({});
    expect(unmatched.sort()).toEqual(["sv8-252", "sv8-999"]);
  });
});
