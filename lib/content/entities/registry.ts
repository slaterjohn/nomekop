import snapshot from "@/lib/content/entities/data.json";
import type { ArtistEntity, EntitySnapshot, PokemonEntity } from "@/lib/content/entities/types";
import { toNfc } from "@/lib/url-params";

// Full per-entity stats for the Pokémon and illustrator info pages. This module
// imports the heavy data.json, so import it ONLY from the entity page routes —
// broad consumers (sitemap, cross-linker) should use catalog.ts instead.

const snap = snapshot as unknown as EntitySnapshot;

export const ENTITIES_AS_OF = snap.asOf;

// Slug keys are composed (NFC) on both sides — see toNfc in lib/url-params.ts.
// Three Pokémon slugs and three artist slugs carry an accent, and a Mac sends
// those decomposed, which no exact Map key can match. The snapshots are written
// composed today; normalising the keys too means a regeneration on a machine
// that emits NFD cannot silently break the lookup.
const POKEMON_BY_SLUG = new Map(snap.pokemon.map((p) => [toNfc(p.slug), p]));
const POKEMON_BY_DEX = new Map(snap.pokemon.map((p) => [p.dex, p]));
const ARTIST_BY_SLUG = new Map(snap.artists.map((a) => [toNfc(a.slug), a]));

export function getPokemonEntity(slug: string): PokemonEntity | undefined {
  return POKEMON_BY_SLUG.get(toNfc(slug));
}

export function getPokemonByDex(dex: number): PokemonEntity | undefined {
  return POKEMON_BY_DEX.get(dex);
}

export function allPokemonEntities(): PokemonEntity[] {
  return snap.pokemon;
}

export function getArtistEntity(slug: string): ArtistEntity | undefined {
  return ARTIST_BY_SLUG.get(toNfc(slug));
}

/** Every artist with a full info page (≥ threshold), card-count desc. */
export function gatedArtists(): ArtistEntity[] {
  return snap.artists;
}
