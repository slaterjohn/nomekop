import { describe, expect, it } from "vitest";
import { applyArtistOverrides } from "@/lib/tcg/artist-overrides";
import type { TcgCard } from "@/lib/tcg/types";

function mk(id: string, artist?: string): TcgCard {
  return {
    id,
    name: "Card",
    number: "1",
    rarity: "Common",
    supertype: "Pokémon",
    imageSmall: "",
    imageLarge: "",
    variants: { normal: true, reverse: false, holo: false },
    ...(artist ? { artist } : {}),
  };
}

describe("applyArtistOverrides", () => {
  it("fills a blank artist credit from the override map", () => {
    const card = applyArtistOverrides([mk("sv8-1")], { "sv8-1": "Tetsu Kayama" })[0]!;
    expect(card.artist).toBe("Tetsu Kayama");
  });

  it("never overwrites a real credit (self-heals if the API later adds it)", () => {
    const card = applyArtistOverrides([mk("base1-4", "Mitsuhiro Arita")], {
      "base1-4": "Someone Else",
    })[0]!;
    expect(card.artist).toBe("Mitsuhiro Arita");
  });

  it("leaves a card untouched when it has no override entry", () => {
    const card = applyArtistOverrides([mk("sv8-2")], { "sv8-1": "Tetsu Kayama" })[0]!;
    expect(card.artist).toBeUndefined();
  });

  it("is a no-op (same array contents) with an empty override map", () => {
    const input = [mk("a"), mk("b", "X")];
    const out = applyArtistOverrides(input, {});
    expect(out).toEqual(input);
  });

  it("preserves all other card fields", () => {
    const card = applyArtistOverrides([mk("sv8-1")], { "sv8-1": "Tetsu Kayama" })[0]!;
    expect(card.id).toBe("sv8-1");
    expect(card.variants).toEqual({ normal: true, reverse: false, holo: false });
  });
});
