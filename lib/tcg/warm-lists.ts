// Curated lists the daily refresher pre-warms so the common Pokémon and
// illustrator binders load instantly. Individual names not listed here still
// cache on first view (12h TTL). Kept deliberately modest + paced so the
// background walk never trips pokemontcg.io rate limits.

import { slugifyPokemonName } from "@/lib/pokemon-binder";
import { slugifyArtistName } from "@/lib/illustrator-binder";

export const POPULAR_POKEMON: string[] = [
  "Pikachu",
  "Charizard",
  "Eevee",
  "Mew",
  "Mewtwo",
  "Gengar",
  "Snorlax",
  "Umbreon",
  "Sylveon",
  "Rayquaza",
  "Lucario",
  "Gardevoir",
  "Greninja",
  "Dragonite",
  "Gyarados",
  "Bulbasaur",
  "Charmander",
  "Squirtle",
  "Jigglypuff",
  "Lugia",
];

export const POPULAR_ILLUSTRATORS: string[] = [
  "Ken Sugimori",
  "Mitsuhiro Arita",
  "5ban Graphics",
  "Kagemaru Himeno",
  "Atsuko Nishida",
  "Naoki Saito",
];

/** Cache keys the refresher writes — must match lib/tcg's getOrCompute keys. */
export const POPULAR_POKEMON_KEYS = POPULAR_POKEMON.map((n) => ({
  name: n,
  key: `pokemon:${slugifyPokemonName(n)}`,
}));

export const POPULAR_ILLUSTRATOR_KEYS = POPULAR_ILLUSTRATORS.map((n) => ({
  name: n,
  key: `illustrator:${slugifyArtistName(n)}`,
}));
