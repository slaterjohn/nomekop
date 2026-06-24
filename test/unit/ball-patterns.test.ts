import { describe, it, expect } from "vitest";
import { applyBallPatterns, setHasBallPatterns, setPatternKinds } from "@/lib/tcg/ball-patterns";
import type { TcgCard } from "@/lib/tcg/types";

const card = (over: Partial<TcgCard>): TcgCard => ({
  id: "x",
  name: "X",
  number: "1",
  rarity: "Common",
  supertype: "Pokémon",
  imageSmall: "",
  imageLarge: "",
  variants: { normal: true, reverse: true, holo: false },
  ...over,
});

describe("ball patterns (curated — API exposes none)", () => {
  it("knows which sets have ball-pattern mirrors", () => {
    expect(setHasBallPatterns("sv8pt5")).toBe(true); // Prismatic Evolutions
    expect(setHasBallPatterns("zsv10pt5")).toBe(true); // Black Bolt
    expect(setHasBallPatterns("rsv10pt5")).toBe(true); // White Flare
    expect(setHasBallPatterns("me2pt5")).toBe(true); // Ascended Heroes
    expect(setHasBallPatterns("sv1")).toBe(false);
    expect(setHasBallPatterns("base1")).toBe(false);
  });

  it("exposes which pattern toggles each set offers", () => {
    // Scarlet & Violet ball sets: Poké Ball + Master Ball, no Energy.
    expect(setPatternKinds("sv8pt5")).toEqual({
      pokeball: true,
      masterball: true,
      energy: false,
    });
    // Ascended Heroes (Mega era): Poké Ball + Energy, no Master Ball.
    expect(setPatternKinds("me2pt5")).toEqual({
      pokeball: true,
      masterball: false,
      energy: true,
    });
    expect(setPatternKinds("sv1")).toEqual({
      pokeball: false,
      masterball: false,
      energy: false,
    });
  });

  it("PRE: poké ball mirrors the reverse pool; master ball is Pokémon-only", () => {
    const pokemon = card({ supertype: "Pokémon" });
    const trainer = card({ id: "t", supertype: "Trainer", name: "Rare Candy" });
    const secret = card({
      id: "s",
      number: "180",
      rarity: "Special Illustration Rare",
      variants: { normal: true, reverse: false, holo: false },
    });
    const [p, t, s] = applyBallPatterns("sv8pt5", [pokemon, trainer, secret]);
    expect(p!.variants).toMatchObject({ pokeball: true, masterball: true });
    expect(t!.variants).toMatchObject({ pokeball: true, masterball: false });
    expect(s!.variants).toMatchObject({ pokeball: false, masterball: false });
  });

  it("AH: non-ex Pokémon get Poké Ball + Energy in place of a plain reverse; Trainers keep reverse", () => {
    const pokemon = card({ supertype: "Pokémon" }); // reverse:true
    const trainer = card({ id: "t", supertype: "Trainer", name: "Cynthia" });
    const ex = card({
      id: "e",
      name: "Mega Charizard Y ex",
      rarity: "Double Rare",
      variants: { normal: true, reverse: false, holo: true }, // ex have no reverse
    });
    const [p, t, e] = applyBallPatterns("me2pt5", [pokemon, trainer, ex]);
    // Pokémon: gains both patterns, loses its plain reverse (it's replaced by them).
    expect(p!.variants).toMatchObject({
      reverse: false,
      pokeball: true,
      energy: true,
      masterball: false,
    });
    // Trainer: keeps a plain reverse, no patterns.
    expect(t!.variants).toMatchObject({
      reverse: true,
      pokeball: false,
      energy: false,
    });
    // ex/secret with no reverse: nothing applied.
    expect(e!.variants).toMatchObject({
      reverse: false,
      pokeball: false,
      energy: false,
    });
  });

  it("PRE: ball sets do not set the Energy flag", () => {
    const [p] = applyBallPatterns("sv8pt5", [card({ supertype: "Pokémon" })]);
    expect(p!.variants.energy).toBe(false);
  });

  it("leaves cards untouched for sets without ball patterns", () => {
    const [c] = applyBallPatterns("sv1", [card({})]);
    expect(c!.variants.pokeball).toBeUndefined();
    expect(c!.variants.masterball).toBeUndefined();
    expect(c!.variants.energy).toBeUndefined();
  });

  it("is idempotent — re-applying an already-patterned payload is a no-op", () => {
    // Matters most for me2pt5: its rule CLEARS the Pokémon reverse, so a naive
    // second pass would drop the patterns the first pass set. Applied at read
    // time, the same cached payload may pass through twice.
    const cards = [
      card({ supertype: "Pokémon" }),
      card({ id: "t", supertype: "Trainer", name: "Cynthia" }),
    ];
    for (const setId of ["me2pt5", "sv8pt5"]) {
      const once = applyBallPatterns(setId, cards);
      const twice = applyBallPatterns(setId, once);
      expect(twice, setId).toEqual(once);
    }
  });
});
