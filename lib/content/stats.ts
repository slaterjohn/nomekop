// Headline figures from the pokemontcg.io dataset NOMEKOP caches, snapshotted
// for the "fun facts" content and the rotating "Did you know?" tips. Plain data
// (no Date/Math.random) so it stays deterministic in tests.

export const STATS_AS_OF = "June 2026";

export const TCG_TOTALS = {
  cards: 20_359,
  sets: 173,
  illustrators: 386,
  dexNumbers: 1_020,
  pokemonCards: 17_195,
  trainerCards: 2_771,
  energyCards: 393,
} as const;

/** Short, linkable facts surfaced around the interface. Each maps to a deeper
 *  article under /facts. */
export const DID_YOU_KNOW: readonly string[] = [
  "There are 20,359 Pokémon TCG cards across 173 different sets.",
  "Pikachu appears on 176 cards across 88 sets — more than any other Pokémon.",
  "The first Pikachu card was Base Set #58, released in January 1999.",
  "The Pokémon TCG has been drawn by 386 different illustrators.",
  "5ban Graphics has illustrated more cards (1,627) than any single artist.",
  "There are 107 cards simply named “Charizard”, spread across 50 sets.",
  "Ascended Heroes (295 cards) is the largest standard Pokémon TCG expansion; the SWSH Black Star Promos top everything at 304.",
  "The Base Set (January 1999) is the oldest Pokémon TCG set.",
  "Cards exist for 1,020 distinct National Pokédex numbers.",
];
