// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  buildIllustratorLayout,
  decodeIllustratorToken,
  encodeIllustratorToken,
  DEFAULT_ILLUSTRATOR_OPTIONS,
} from "@/lib/illustrator-binder";
import type { CardWithSet } from "@/lib/tcg/types";

const card = (over: Partial<CardWithSet>): CardWithSet => ({
  id: "x-1",
  name: "Pikachu",
  number: "1",
  rarity: "Common",
  supertype: "Pokémon",
  imageSmall: "",
  imageLarge: "",
  variants: { normal: true, reverse: false, holo: false },
  artist: "Ken Sugimori",
  setId: "x",
  setName: "X",
  setReleaseDate: "2020/01/01",
  setPrintedTotal: 100,
  secret: false,
  ...over,
});

const CARDS: CardWithSet[] = [
  card({ id: "a-1", setId: "a", setReleaseDate: "1999/01/09", number: "1" }),
  card({ id: "a-2", setId: "a", setReleaseDate: "1999/01/09", number: "2" }),
  card({ id: "b-7", setId: "b", setReleaseDate: "2023/03/31", number: "7" }),
  card({ id: "b-2", setId: "b", setReleaseDate: "2023/03/31", number: "2" }),
];

describe("illustrator binder tokens", () => {
  it("encodes name + options compactly", () => {
    expect(encodeIllustratorToken("Ken Sugimori", DEFAULT_ILLUSTRATOR_OPTIONS)).toBe(
      "ken-sugimori~34n",
    );
    expect(
      encodeIllustratorToken("5ban Graphics", { rows: 2, cols: 2, order: "old" }),
    ).toBe("5ban-graphics~22o");
  });

  it("round-trips", () => {
    const tok = encodeIllustratorToken("Mitsuhiro Arita", { rows: 4, cols: 4, order: "new" });
    const decoded = decodeIllustratorToken(tok);
    expect(decoded).toEqual({
      name: "mitsuhiro-arita",
      options: { rows: 4, cols: 4, order: "new" },
    });
  });

  it("rejects malformed tokens", () => {
    for (const bad of ["", "~34n", "ken-sugimori~99n", "ken-sugimori~34z", "ken/sugimori~34n", "ken-sugimori~34an"]) {
      expect(decodeIllustratorToken(bad), bad).toBeNull();
    }
  });
});

describe("buildIllustratorLayout", () => {
  it("orders newest-first by default and paginates", () => {
    const layout = buildIllustratorLayout(CARDS, DEFAULT_ILLUSTRATOR_OPTIONS);
    const ids = layout.pages.flatMap((p) => p.slots).flatMap((s) => (s.kind === "empty" ? [] : [s.card.id]));
    expect(ids).toEqual(["b-2", "b-7", "a-1", "a-2"]);
    expect(layout.stats.slots).toBe(4);
    expect(layout.stats.byKind).toEqual({ card: 4, reverse: 0, pokeball: 0, masterball: 0 });
  });

  it("oldest-first flips set order, keeping number order within a set", () => {
    const layout = buildIllustratorLayout(CARDS, { ...DEFAULT_ILLUSTRATOR_OPTIONS, order: "old" });
    const ids = layout.pages.flatMap((p) => p.slots).flatMap((s) => (s.kind === "empty" ? [] : [s.card.id]));
    expect(ids).toEqual(["a-1", "a-2", "b-2", "b-7"]);
  });

  it("paginates into pages of rows×cols pockets", () => {
    const layout = buildIllustratorLayout(CARDS, { rows: 1, cols: 2, order: "new" });
    expect(layout.stats.pages).toBe(2);
    expect(layout.stats.slotsPerPage).toBe(2);
  });
});
