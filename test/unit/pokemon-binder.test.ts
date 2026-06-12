// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  buildPokemonLayout,
  decodePokemonToken,
  encodePokemonToken,
  DEFAULT_POKEMON_OPTIONS,
} from "@/lib/pokemon-binder";
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
  setId: "x",
  setName: "X",
  setReleaseDate: "2020/01/01",
  setPrintedTotal: 100,
  secret: false,
  ...over,
});

const CARDS: CardWithSet[] = [
  card({ id: "a-1", setId: "a", setReleaseDate: "1999/01/09", rarity: "Common" }),
  card({ id: "a-105", setId: "a", setReleaseDate: "1999/01/09", number: "105", secret: true, rarity: "Rare Secret" }),
  card({ id: "b-7", setId: "b", setReleaseDate: "2023/03/31", number: "7", rarity: "Rare Holo" }),
  card({ id: "b-2", setId: "b", setReleaseDate: "2023/03/31", number: "2", rarity: "Common" }),
];

describe("pokemon binder tokens", () => {
  it("encodes name + options compactly", () => {
    expect(encodePokemonToken("Pikachu", DEFAULT_POKEMON_OPTIONS)).toBe("pikachu~34an");
    expect(
      encodePokemonToken("Mr. Mime", { rows: 2, cols: 2, filter: "secret", order: "old" }),
    ).toBe("mr.-mime~22so");
  });

  it("round-trips", () => {
    const tok = encodePokemonToken("Farfetch'd", { rows: 4, cols: 4, filter: "best", order: "new" });
    const decoded = decodePokemonToken(tok);
    expect(decoded).toEqual({
      name: "farfetch'd",
      options: { rows: 4, cols: 4, filter: "best", order: "new" },
    });
  });

  it("rejects malformed tokens", () => {
    for (const bad of ["", "~34an", "pikachu~99an", "pikachu~34zn", "pika/chu~34an"]) {
      expect(decodePokemonToken(bad), bad).toBeNull();
    }
  });
});

describe("buildPokemonLayout", () => {
  it("orders newest-first by default and paginates", () => {
    const layout = buildPokemonLayout(CARDS, DEFAULT_POKEMON_OPTIONS);
    const ids = layout.pages.flatMap((p) => p.slots).flatMap((s) => (s.kind === "empty" ? [] : [s.card.id]));
    expect(ids).toEqual(["b-2", "b-7", "a-1", "a-105"]);
    expect(layout.stats.slots).toBe(4);
  });

  it("oldest-first flips set order, keeping number order within a set", () => {
    const layout = buildPokemonLayout(CARDS, { ...DEFAULT_POKEMON_OPTIONS, order: "old" });
    const ids = layout.pages.flatMap((p) => p.slots).flatMap((s) => (s.kind === "empty" ? [] : [s.card.id]));
    expect(ids).toEqual(["a-1", "a-105", "b-2", "b-7"]);
  });

  it("secrets-only filter", () => {
    const layout = buildPokemonLayout(CARDS, { ...DEFAULT_POKEMON_OPTIONS, filter: "secret" });
    const ids = layout.pages.flatMap((p) => p.slots).flatMap((s) => (s.kind === "empty" ? [] : [s.card.id]));
    expect(ids).toEqual(["a-105"]);
  });

  it("best-per-set keeps one rarest card per set", () => {
    const layout = buildPokemonLayout(CARDS, { ...DEFAULT_POKEMON_OPTIONS, filter: "best" });
    const ids = layout.pages.flatMap((p) => p.slots).flatMap((s) => (s.kind === "empty" ? [] : [s.card.id]));
    expect(ids).toEqual(["b-7", "a-105"]); // Rare Holo beats Common; Rare Secret beats Common
  });
});
