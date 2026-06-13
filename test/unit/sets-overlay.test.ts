// @vitest-environment node
import { describe, it, expect } from "vitest";
import { buildSetOverlay } from "@/lib/sets-overlay";
import type { TcgSet } from "@/lib/tcg/types";

const set = (over: Partial<TcgSet>): TcgSet => ({
  id: "x",
  name: "X",
  series: "S",
  printedTotal: 100,
  total: 100,
  releaseDate: "2020/01/01",
  symbolUrl: "",
  logoUrl: "",
  ...over,
});

// pokemontcg.io English sets (different ids from TCGdex).
const englishSets: TcgSet[] = [
  set({ id: "me4", name: "Chaos Rising" }),
  set({ id: "sv3pt5", name: "151" }),
];

// TCGdex English list — the bridge (its names match pokemontcg.io, ids don't).
const tcgdexEn: TcgSet[] = [
  set({ id: "me04", name: "Chaos Rising" }),
  set({ id: "sv2a", name: "151" }),
  set({ id: "SVK", name: "Scarlet & Violet Deck Build Box" }), // English-only, not in pokemontcg fixture
];

describe("buildSetOverlay", () => {
  it("badges an English set when the localized name matches (same name kept)", () => {
    // French "151" kept the name "151" → badge, not a separate row.
    const tcgdexFr: TcgSet[] = [set({ id: "sv2a", name: "151", total: 207 })];
    const { badges, variants, exclusive } = buildSetOverlay(englishSets, tcgdexEn, tcgdexFr, "fr");
    expect(badges.get("sv3pt5")).toMatchObject({ lang: "fr", localizedId: "sv2a", total: 207 });
    expect(variants.size).toBe(0);
    expect(exclusive).toHaveLength(0);
  });

  it("interleaves a localized set beside its English entry when the name differs", () => {
    // Japanese "Chaos Rising" has a translated name → interleave under me4.
    const tcgdexJa: TcgSet[] = [set({ id: "me04", name: "カオスライジング" })];
    const { badges, variants } = buildSetOverlay(englishSets, tcgdexEn, tcgdexJa, "ja");
    expect(badges.size).toBe(0);
    expect(variants.get("me4")).toEqual([
      { lang: "ja", localizedId: "me04", name: "カオスライジング", total: 100 },
    ]);
  });

  it("lists language-exclusive sets (no English counterpart) on their own, newest first", () => {
    const tcgdexJa: TcgSet[] = [
      set({ id: "SVK", name: "デッキビルドBOX" }), // bridges to an English name absent from pokemontcg
      set({ id: "unknown-x", name: "ポケモンだいすきクラブ" }), // no bridge at all
    ];
    const { badges, variants, exclusive } = buildSetOverlay(englishSets, tcgdexEn, tcgdexJa, "ja");
    expect(badges.size).toBe(0);
    expect(variants.size).toBe(0);
    // reversed: last in the TCGdex list comes first
    expect(exclusive.map((e) => e.localizedId)).toEqual(["unknown-x", "SVK"]);
  });

  it("matches names case- and whitespace-insensitively", () => {
    const tcgdexFr: TcgSet[] = [set({ id: "me04", name: "  chaos   rising " })];
    const { badges } = buildSetOverlay(englishSets, tcgdexEn, tcgdexFr, "fr");
    expect(badges.has("me4")).toBe(true);
  });
});
