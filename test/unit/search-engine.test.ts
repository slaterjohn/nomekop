import { describe, it, expect } from "vitest";
import { runSearch } from "@/lib/search/search";
import type { SearchEntry } from "@/lib/search/types";

const entries: SearchEntry[] = [
  { type: "pokemon", label: "Charizard", url: "/pokemon/charizard" },
  { type: "pokemon", label: "Charmander", url: "/pokemon/charmander" },
  { type: "pokemon", label: "Pikachu", url: "/pokemon/pikachu" },
  { type: "set", label: "Charizard ex Premium", url: "/set/cz" },
  { type: "artist", label: "Mitsuhiro Arita", url: "/illustrator/mitsuhiro-arita" },
  { type: "faq", label: "How many Charizard cards are there?", url: "/faqs/charizard-count" },
  { type: "fact", label: "Which Charizard is rarest?", url: "/facts/charizard-rarest" },
];

describe("runSearch", () => {
  it("groups matches by type in a fixed order, dropping empty groups", () => {
    const groups = runSearch("char", entries, {});
    expect(groups.map((g) => g.type)).toEqual(["pokemon", "set", "faq", "fact"]);
    // artists didn't match → no Artists group
    expect(groups.find((g) => g.type === "artist")).toBeUndefined();
  });

  it("ranks better matches first within a group", () => {
    const pokemon = runSearch("char", entries, {}).find((g) => g.type === "pokemon")!;
    expect(pokemon.items.map((i) => i.label)).toEqual(["Charizard", "Charmander"]);
    expect(pokemon.items.find((i) => i.label === "Pikachu")).toBeUndefined();
  });

  it("caps each group at perGroup", () => {
    const many: SearchEntry[] = Array.from({ length: 10 }, (_, i) => ({
      type: "pokemon",
      label: `Char${i}`,
      url: `/pokemon/char${i}`,
    }));
    const groups = runSearch("char", many, { perGroup: 3 });
    expect(groups[0]!.items).toHaveLength(3);
  });

  it("scope restricts to a single type", () => {
    const groups = runSearch("char", entries, { scope: "faq" });
    expect(groups.map((g) => g.type)).toEqual(["faq"]);
    expect(groups[0]!.items[0]!.url).toBe("/faqs/charizard-count");
  });

  it("returns nothing for an empty or whitespace query", () => {
    expect(runSearch("", entries, {})).toEqual([]);
    expect(runSearch("   ", entries, {})).toEqual([]);
  });

  it("each group carries a human label", () => {
    const groups = runSearch("char", entries, {});
    expect(groups.find((g) => g.type === "pokemon")!.label).toBe("Pokémon");
    expect(groups.find((g) => g.type === "set")!.label).toBe("Sets");
  });
});
