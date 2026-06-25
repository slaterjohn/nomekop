import index from "@/lib/content/entities/index.json";
import type { ArtistIndexEntry, EntityCatalog, PokemonCatalogEntry } from "@/lib/content/entities/types";

// Lightweight entity catalog: slugs, display names and the artist gating
// decision — no stats, no card refs. Safe to import broadly (sitemap, and the
// Phase 5 cross-linker, which run on every page). The heavy per-entity stats
// live in registry.ts.

const catalog = index as EntityCatalog;
const ARTIST_MIN = catalog.thresholds.artistMinCards;

const POKEMON_BY_SLUG = new Map(catalog.pokemon.map((p) => [p.slug, p]));
const ARTIST_BY_SLUG = new Map(catalog.artists.map((a) => [a.slug, a]));
const POKEMON_SLUG_BY_NAME = new Map(catalog.pokemon.map((p) => [p.name.toLowerCase(), p.slug]));
const ARTIST_SLUG_BY_NAME = new Map(catalog.artists.map((a) => [a.name.toLowerCase(), a.slug]));

export function pokemonCatalog(): PokemonCatalogEntry[] {
  return catalog.pokemon;
}

export function pokemonSlugs(): string[] {
  return catalog.pokemon.map((p) => p.slug);
}

export function getPokemonCatalogEntry(slug: string): PokemonCatalogEntry | undefined {
  return POKEMON_BY_SLUG.get(slug);
}

/** Every artist (including below-threshold ones), for linking decisions. */
export function artistCatalog(): ArtistIndexEntry[] {
  return catalog.artists;
}

/** True when an artist has enough cards to warrant a full info page. */
export function artistHasPage(slug: string): boolean {
  const entry = ARTIST_BY_SLUG.get(slug);
  return entry !== undefined && entry.cardCount >= ARTIST_MIN;
}

/** Slugs of every artist with a page (card-count desc, as snapshotted). */
export function gatedArtistSlugs(): string[] {
  return catalog.artists.filter((a) => a.cardCount >= ARTIST_MIN).map((a) => a.slug);
}

/** Resolve a display name to a Pokémon slug (case-insensitive) — for cross-links. */
export function pokemonSlugByName(name: string): string | undefined {
  return POKEMON_SLUG_BY_NAME.get(name.trim().toLowerCase());
}

/** Resolve a display name to an artist slug (case-insensitive) — for cross-links. */
export function artistSlugByName(name: string): string | undefined {
  return ARTIST_SLUG_BY_NAME.get(name.trim().toLowerCase());
}
