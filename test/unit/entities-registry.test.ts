import { describe, expect, it } from "vitest";
import {
  pokemonCatalog,
  pokemonSlugs,
  getPokemonCatalogEntry,
  artistCatalog,
  gatedArtistSlugs,
  artistHasPage,
  pokemonSlugByName,
  artistSlugByName,
} from "@/lib/content/entities/catalog";
import {
  getPokemonEntity,
  getPokemonByDex,
  allPokemonEntities,
  getArtistEntity,
  gatedArtists,
} from "@/lib/content/entities/registry";

describe("entities catalog (light)", () => {
  it("lists every Pokémon with cards", () => {
    expect(pokemonSlugs()).toContain("pikachu");
    expect(pokemonCatalog().length).toBe(1020);
  });

  it("resolves a Pokémon slug to its dex", () => {
    expect(getPokemonCatalogEntry("pikachu")?.dex).toBe(25);
    expect(getPokemonCatalogEntry("not-a-pokemon")).toBeUndefined();
  });

  it("gates artist pages at the ≥5-card threshold", () => {
    expect(artistHasPage("5ban-graphics")).toBe(true);
    const below = artistCatalog().find((a) => a.cardCount < 5);
    expect(below).toBeDefined();
    expect(artistHasPage(below!.slug)).toBe(false);
    expect(artistHasPage("nobody-at-all")).toBe(false);
  });

  it("gatedArtistSlugs are exactly the artists with a page", () => {
    const slugs = gatedArtistSlugs();
    expect(slugs).toContain("5ban-graphics");
    expect(slugs.every((s) => artistHasPage(s))).toBe(true);
  });

  it("maps display names back to slugs (case-insensitive) for cross-linking", () => {
    expect(pokemonSlugByName("Pikachu")).toBe("pikachu");
    expect(pokemonSlugByName("PIKACHU")).toBe("pikachu");
    expect(artistSlugByName("5ban Graphics")).toBe("5ban-graphics");
    expect(pokemonSlugByName("Totally Not Real")).toBeUndefined();
  });
});

describe("entities registry (full stats)", () => {
  it("returns the full Pokémon entity by slug", () => {
    const pika = getPokemonEntity("pikachu");
    expect(pika?.dex).toBe(25);
    expect(pika!.cardCount).toBeGreaterThan(0);
    expect(pika!.setCount).toBeGreaterThan(0);
    expect(pika!.firstSet.id).toBeTruthy();
  });

  it("returns a Pokémon entity by dex", () => {
    expect(getPokemonByDex(25)?.slug).toBe("pikachu");
    expect(getPokemonByDex(99999)).toBeUndefined();
  });

  it("lists all Pokémon entities", () => {
    expect(allPokemonEntities().length).toBe(1020);
  });

  it("returns full artist entities and undefined for unknowns", () => {
    const fban = getArtistEntity("5ban-graphics");
    expect(fban!.cardCount).toBeGreaterThan(1000);
    expect(fban!.topPokemon.length).toBeGreaterThan(0);
    expect(getArtistEntity("nobody-at-all")).toBeUndefined();
  });

  it("only surfaces gated artists, all at or above threshold", () => {
    const artists = gatedArtists();
    expect(artists.length).toBeGreaterThan(0);
    expect(artists.every((a) => a.cardCount >= 5)).toBe(true);
  });
});
