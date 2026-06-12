import { describe, it, expect } from "vitest";
import { applyBallPatterns, setHasBallPatterns } from "@/lib/tcg/ball-patterns";
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
    expect(setHasBallPatterns("sv1")).toBe(false);
    expect(setHasBallPatterns("base1")).toBe(false);
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

  it("leaves cards untouched for sets without ball patterns", () => {
    const [c] = applyBallPatterns("sv1", [card({})]);
    expect(c!.variants.pokeball).toBeUndefined();
    expect(c!.variants.masterball).toBeUndefined();
  });
});
