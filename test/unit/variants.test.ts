import { describe, it, expect } from "vitest";
import { deriveVariants } from "@/lib/tcg/variants";

const modernSet = { releaseDate: "2023/03/31", printedTotal: 198 };
const vintageSet = { releaseDate: "1999/01/09", printedTotal: 102 };

describe("deriveVariants from tcgplayer price keys", () => {
  it("normal + reverseHolofoil → both variants", () => {
    const v = deriveVariants(
      { normal: {}, reverseHolofoil: {} },
      { ...modernSet, number: "5", rarity: "Common" },
    );
    expect(v).toEqual({ normal: true, reverse: true, holo: false });
  });

  it("holofoil only → holo, no reverse, no normal", () => {
    const v = deriveVariants(
      { holofoil: {} },
      { ...vintageSet, number: "4", rarity: "Rare Holo" },
    );
    expect(v).toEqual({ normal: false, reverse: false, holo: true });
  });

  it("1stEdition/unlimited vintage keys → normal print, holo when holofoil", () => {
    const v = deriveVariants(
      { "1stEditionHolofoil": {}, unlimitedHolofoil: {} },
      { ...vintageSet, number: "4", rarity: "Rare Holo" },
    );
    expect(v).toEqual({ normal: true, reverse: false, holo: true });
  });
});

describe("deriveVariants heuristic fallback (no price data)", () => {
  it("pre-2002 sets never have reverses", () => {
    const v = deriveVariants(undefined, { ...vintageSet, number: "23", rarity: "Common" });
    expect(v.reverse).toBe(false);
    expect(v.normal).toBe(true);
  });

  it("modern common within printed range gets a reverse", () => {
    const v = deriveVariants(undefined, { ...modernSet, number: "5", rarity: "Common" });
    expect(v).toEqual({ normal: true, reverse: true, holo: false });
  });

  it("modern secret rare (beyond printedTotal) gets no reverse", () => {
    const v = deriveVariants(undefined, {
      ...modernSet,
      number: "250",
      rarity: "Special Illustration Rare",
    });
    expect(v.reverse).toBe(false);
  });

  it("prefixed subset numbers (TG01) get no reverse", () => {
    const v = deriveVariants(undefined, { ...modernSet, number: "TG01", rarity: "Trainer Gallery Rare Holo" });
    expect(v.reverse).toBe(false);
  });

  it("empty price object falls back to heuristic", () => {
    const v = deriveVariants({}, { ...modernSet, number: "9", rarity: "Uncommon" });
    expect(v.reverse).toBe(true);
  });

  it("'Rare Holo' rarity marks holo in fallback", () => {
    const v = deriveVariants(undefined, { ...modernSet, number: "12", rarity: "Rare Holo" });
    expect(v.holo).toBe(true);
  });
});
