import { describe, expect, it } from "vitest";
import { indefiniteArticle, pokemonInSetSlug } from "@/lib/content/faqs/slug";

describe("faq slug helpers", () => {
  it("chooses a/an by leading vowel sound", () => {
    expect(indefiniteArticle("Charizard")).toBe("a");
    expect(indefiniteArticle("Umbreon")).toBe("an");
    expect(indefiniteArticle("Eevee")).toBe("an");
  });

  it("builds a deterministic pokemon-in-set slug", () => {
    expect(pokemonInSetSlug("umbreon", "prismatic-evolutions")).toBe(
      "is-there-an-umbreon-card-in-prismatic-evolutions",
    );
    expect(pokemonInSetSlug("charizard", "151")).toBe("is-there-a-charizard-card-in-151");
  });
});
