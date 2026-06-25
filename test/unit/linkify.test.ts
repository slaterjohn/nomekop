import { describe, expect, it } from "vitest";
import { linkifyEntities, type EntityMatch } from "@/lib/content/linkify";

const MATCHERS: EntityMatch[] = [
  { name: "Charizard", href: "/pokemon/charizard" },
  { name: "Mew", href: "/pokemon/mew" },
  { name: "Mewtwo", href: "/pokemon/mewtwo" },
  { name: "Pikachu", href: "/pokemon/pikachu" },
  { name: "Mitsuhiro Arita", href: "/illustrator/mitsuhiro-arita" },
];

const link = (md: string) => linkifyEntities(md, MATCHERS);

describe("linkifyEntities", () => {
  it("links the first mention of a known entity", () => {
    expect(link("The Charizard card is iconic.")).toBe(
      "The [Charizard](/pokemon/charizard) card is iconic.",
    );
  });

  it("links only the first mention per entity", () => {
    expect(link("Charizard then Charizard again")).toBe(
      "[Charizard](/pokemon/charizard) then Charizard again",
    );
  });

  it("respects word boundaries (Mew does not match inside Mewtwo)", () => {
    // Mewtwo is its own entity and wins; Mew must not corrupt it.
    expect(link("Mewtwo is strong")).toBe("[Mewtwo](/pokemon/mewtwo) is strong");
  });

  it("prefers the longest match at a position", () => {
    expect(link("Mewtwo and Mew")).toBe(
      "[Mewtwo](/pokemon/mewtwo) and [Mew](/pokemon/mew)",
    );
  });

  it("never double-links inside an existing markdown link", () => {
    const md = "See [Charizard](/card/base1-4) here. Charizard again.";
    // The existing link is untouched; the later bare mention is linked.
    expect(link(md)).toBe("See [Charizard](/card/base1-4) here. [Charizard](/pokemon/charizard) again.");
  });

  it("does not link inside inline code", () => {
    expect(link("Use `Charizard` verbatim")).toBe("Use `Charizard` verbatim");
  });

  it("does not link inside fenced code blocks", () => {
    const md = "```\nCharizard\n```\nCharizard outside";
    expect(link(md)).toBe("```\nCharizard\n```\n[Charizard](/pokemon/charizard) outside");
  });

  it("does not link inside headings", () => {
    expect(link("# Charizard\nCharizard in body")).toBe(
      "# Charizard\n[Charizard](/pokemon/charizard) in body",
    );
  });

  it("is case-sensitive so lowercase common words are left alone", () => {
    // No capitalised proper noun → no link (guards against false positives).
    expect(link("mew of fresh paint")).toBe("mew of fresh paint");
  });

  it("links multi-word artist names", () => {
    expect(link("Art by Mitsuhiro Arita.")).toBe(
      "Art by [Mitsuhiro Arita](/illustrator/mitsuhiro-arita).",
    );
  });

  it("leaves text with no known entities unchanged", () => {
    expect(link("A booster box of energy cards.")).toBe("A booster box of energy cards.");
  });
});
