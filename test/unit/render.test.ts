import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/content/render";

describe("renderMarkdown — typed entity links", () => {
  it("styles an internal Pokémon link with a pixel icon and solid underline", () => {
    const html = renderMarkdown("See [Pikachu](/pokemon/pikachu) here.");
    expect(html).toContain('href="/pokemon/pikachu"');
    expect(html).toContain("decoration-solid");
    expect(html).toContain("<svg"); // the pixel icon
  });

  it("gives each entity type its own underline style", () => {
    expect(renderMarkdown("[x](/illustrator/ken-sugimori)")).toContain("decoration-double");
    expect(renderMarkdown("[x](/set/base1)")).toContain("decoration-4");
    expect(renderMarkdown("[x](/card/base1-4)")).toContain("decoration-wavy");
  });

  it("leaves external links untyped (no entity icon)", () => {
    const html = renderMarkdown("[TCGplayer](https://www.tcgplayer.com)");
    expect(html).toContain('href="https://www.tcgplayer.com"');
    expect(html).not.toContain("<svg");
  });

  it("auto-links the first mention of a known Pokémon when linkify is on", () => {
    const html = renderMarkdown("Charizard is the most iconic card.", { linkify: true });
    expect(html).toContain('href="/pokemon/charizard"');
  });

  it("does not auto-link when linkify is off", () => {
    const html = renderMarkdown("Charizard is the most iconic card.");
    expect(html).not.toContain('href="/pokemon/charizard"');
  });
});
