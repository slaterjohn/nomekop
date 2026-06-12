import type { TcgCard } from "@/lib/tcg/types";

type BallRule = (card: TcgCard) => boolean;
type BallRules = { pokeball: BallRule; masterball: BallRule };

// Verified for Prismatic Evolutions (community sources: Poké Ball mirrors the
// reverse pool — Commons/Uncommons/Rares; Master Ball only on Pokémon, not
// Trainers; 481-card master set). Black Bolt / White Flare follow the same
// shape. pokemontcg.io exposes no per-card ball data, so this map is curated —
// new ball-pattern sets are a one-line addition.
const mirrorsReversePool: BallRule = (c) => c.variants.reverse;
const pokemonOnlyMirror: BallRule = (c) => c.variants.reverse && c.supertype === "Pokémon";

const BALL_PATTERN_SETS: Record<string, BallRules> = {
  // Prismatic Evolutions
  sv8pt5: { pokeball: mirrorsReversePool, masterball: pokemonOnlyMirror },
  // Black Bolt
  zsv10pt5: { pokeball: mirrorsReversePool, masterball: pokemonOnlyMirror },
  // White Flare
  rsv10pt5: { pokeball: mirrorsReversePool, masterball: pokemonOnlyMirror },
};

export function setHasBallPatterns(setId: string): boolean {
  return setId in BALL_PATTERN_SETS;
}

/** Marks Poké Ball / Master Ball mirrors on a set's cards (no-op elsewhere). */
export function applyBallPatterns(setId: string, cards: TcgCard[]): TcgCard[] {
  const rules = BALL_PATTERN_SETS[setId];
  if (!rules) return cards;
  return cards.map((card) => ({
    ...card,
    variants: {
      ...card.variants,
      pokeball: rules.pokeball(card),
      masterball: rules.masterball(card),
    },
  }));
}
