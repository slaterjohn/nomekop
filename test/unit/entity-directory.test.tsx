import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { PokemonDirectory } from "@/components/pokemon/pokemon-directory";
import { ArtistDirectory } from "@/components/illustrator/artist-directory";
import { gatedArtistEntries } from "@/lib/content/entities/catalog";

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
