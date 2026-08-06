import index from "@/lib/content/entities/index.json";
import type { ArtistIndexEntry, EntityCatalog, PokemonCatalogEntry } from "@/lib/content/entities/types";
import { toNfc } from "@/lib/url-params";

// Lightweight entity catalog: slugs, display names and the artist gating
// decision — no stats, no card refs. Safe to import broadly (sitemap, and the
// Phase 5 cross-linker, which run on every page). The heavy per-entity stats
// live in registry.ts.

const catalog = index as EntityCatalog;
const ARTIST_MIN = catalog.thresholds.artistMinCards;

// Composed (NFC) keys on both sides of every lookup — see toNfc in
// lib/url-params.ts. Accented slugs (flabébé, mékayu, …) arrive decomposed from
// macOS/iOS, and a decomposed string never equals its composed twin.
const POKEMON_BY_SLUG = new Map(catalog.pokemon.map((p) => [toNfc(p.slug), p]));
const ARTIST_BY_SLUG = new Map(catalog.artists.map((a) => [toNfc(a.slug), a]));
const POKEMON_SLUG_BY_NAME = new Map(catalog.pokemon.map((p) => [toNfc(p.name.toLowerCase()), p.slug]));
const ARTIST_SLUG_BY_NAME = new Map(catalog.artists.map((a) => [toNfc(a.name.toLowerCase()), a.slug]));

export function pokemonCatalog(): PokemonCatalogEntry[] {
  return catalog.pokemon;
}

export function pokemonSlugs(): string[] {
  return catalog.pokemon.map((p) => p.slug);
}

export function getPokemonCatalogEntry(slug: string): PokemonCatalogEntry | undefined {
  return POKEMON_BY_SLUG.get(toNfc(slug));
}

/** Every artist (including below-threshold ones), for linking decisions. */
export function artistCatalog(): ArtistIndexEntry[] {
  return catalog.artists;
}

/** True when an artist has enough cards to warrant a full info page. */
export function artistHasPage(slug: string): boolean {
  const entry = ARTIST_BY_SLUG.get(toNfc(slug));
  return entry !== undefined && entry.cardCount >= ARTIST_MIN;
}

/** Slugs of every artist with a page (card-count desc, as snapshotted). */
export function gatedArtistSlugs(): string[] {
  return catalog.artists.filter((a) => a.cardCount >= ARTIST_MIN).map((a) => a.slug);
}

/** Full index entries for every artist with a page — for the browse directory. */
export function gatedArtistEntries(): ArtistIndexEntry[] {
  return catalog.artists.filter((a) => a.cardCount >= ARTIST_MIN);
}

/** Resolve a display name to a Pokémon slug (case-insensitive) — for cross-links. */
export function pokemonSlugByName(name: string): string | undefined {
  return POKEMON_SLUG_BY_NAME.get(toNfc(name.trim().toLowerCase()));
}

/** Resolve a display name to an artist slug (case-insensitive) — for cross-links. */
export function artistSlugByName(name: string): string | undefined {
  return ARTIST_SLUG_BY_NAME.get(toNfc(name.trim().toLowerCase()));
}
