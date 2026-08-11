import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { PokemonDirectory } from "@/components/pokemon/pokemon-directory";
import { ArtistDirectory } from "@/components/illustrator/artist-directory";
import { gatedArtistEntries } from "@/lib/content/entities/catalog";

// The real catalog is ~1020 Pokémon / ~290 gated artists. Rendering (and, for
// the a11y test, axe-scanning) the FULL directory intermittently blew the
// global 15s testTimeout under `pnpm check`'s parallel workers. Reproduced by
// running the whole suite under load: a plain render of the full dex-grouped
// PokemonDirectory took 16074ms in one run, and a wholly unrelated
// large-render file (faqs-pages.test.tsx) timed out in that same run too —
// proof this is generic CPU contention across ~11 parallel workers, not an
// axe- or component-specific slowdown. So the fix is to do proportionally
// less real work per test, not to chase a bigger timeout.
//
// This bounds both catalogs to a *slice of the real, unmodified data*
// (dex-ordered / card-count-ordered, per catalog.ts) rather than fabricating
// fixtures — every assertion below still exercises genuine production
// content and the genuine component logic (grouping, sorting, links, axe
// rules), just ~10x less of it. Do NOT "simplify" this back to the full
// catalog or swap it for a bigger timeout — both reintroduce the flake.
vi.mock("@/lib/content/entities/catalog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/content/entities/catalog")>();
  // First 160 dex-ordered entries span GEN I (1–151) *and* into GEN II, so
  // the "groups by generation" behaviour still crosses a real boundary.
  const pokemon = actual.pokemonCatalog().slice(0, 160);
  // Already card-count descending — top 30 keeps the "most cards" and "A–Z"
  // extremes both real and meaningful.
  const artists = actual.gatedArtistEntries().slice(0, 30);
  return {
    ...actual,
    pokemonCatalog: () => pokemon,
    gatedArtistEntries: () => artists,
  };
});

describe("PokemonDirectory", () => {
  it("groups by generation in Pokédex order and links to info pages", () => {
    const { container } = render(<PokemonDirectory sort="dex" />);
    expect(screen.getByText(/GEN I · Kanto/)).toBeInTheDocument();
    expect(container.querySelector('a[href="/pokemon/bulbasaur"]')).not.toBeNull();
    expect(container.querySelector('a[href="/pokemon/pikachu"]')).not.toBeNull();
  });

  it("most-cards sort is a flat list (no generation headers)", () => {
    render(<PokemonDirectory sort="cards" />);
    expect(screen.queryByText(/GEN I · Kanto/)).not.toBeInTheDocument();
  });
});

describe("ArtistDirectory", () => {
  it("defaults to most-cards first and links to info pages", () => {
    const top = [...gatedArtistEntries()].sort((a, b) => b.cardCount - a.cardCount)[0]!;
    const { container } = render(<ArtistDirectory sort="cards" />);
    const firstLink = container.querySelector('a[href^="/illustrator/"]');
    expect(firstLink?.getAttribute("href")).toBe(`/illustrator/${encodeURIComponent(top.slug)}`);
  });

  it("A–Z sort orders the first artist alphabetically", () => {
    const azFirst = [...gatedArtistEntries()].sort((a, b) => a.name.localeCompare(b.name))[0]!;
    const { container } = render(<ArtistDirectory sort="name" />);
    const firstLink = container.querySelector('a[href^="/illustrator/"]');
    expect(firstLink?.getAttribute("href")).toBe(`/illustrator/${encodeURIComponent(azFirst.slug)}`);
  });

  it("has no obvious accessibility violations", async () => {
    const { container } = render(<ArtistDirectory sort="cards" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
