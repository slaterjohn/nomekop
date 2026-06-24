import type { TcgCard } from "@/lib/tcg/types";

type PatternRule = (card: TcgCard) => boolean;

/**
 * Per-set reverse-holo PATTERN rules. Each present key marks that special-pattern
 * variant on the cards it matches. An optional `reverse` rule REPLACES the derived
 * plain-reverse flag — Mega-era sets give each non-ex Pokémon two special patterns
 * (Poké Ball + Energy) INSTEAD of a plain reverse, so their plain reverse must be
 * cleared, while Trainers keep theirs.
 *
 * pokemontcg.io exposes no per-card pattern data, so this map is curated and
 * verified against collector master-set guides — new pattern sets are a one-line
 * addition. (Counts: Prismatic 100 Poké Ball + 67 Master Ball; Ascended Heroes
 * 140 Poké Ball + 140 Energy + 38 Trainer reverse = 613 master set.)
 */
type PatternRules = {
  pokeball?: PatternRule;
  masterball?: PatternRule;
  energy?: PatternRule;
  reverse?: PatternRule;
};

// Scarlet & Violet ball sets: Poké Ball mirrors the whole reverse pool
// (Commons/Uncommons/Rares); Master Ball only on Pokémon. Plain reverse stays.
const reversePool: PatternRule = (c) => c.variants.reverse;
const pokemonReverse: PatternRule = (c) => c.variants.reverse && c.supertype === "Pokémon";
const trainerReverse: PatternRule = (c) => c.variants.reverse && c.supertype !== "Pokémon";

const PATTERN_SETS: Record<string, PatternRules> = {
  // Prismatic Evolutions / Black Bolt / White Flare — Poké Ball + Master Ball.
  sv8pt5: { pokeball: reversePool, masterball: pokemonReverse },
  zsv10pt5: { pokeball: reversePool, masterball: pokemonReverse },
  rsv10pt5: { pokeball: reversePool, masterball: pokemonReverse },
  // Ascended Heroes (Mega era) — each non-ex Pokémon has a Poké Ball pattern AND
  // an Energy pattern instead of a plain reverse; Trainers keep a plain reverse.
  me2pt5: { pokeball: pokemonReverse, energy: pokemonReverse, reverse: trainerReverse },
};

export function setHasBallPatterns(setId: string): boolean {
  return setId in PATTERN_SETS;
}

/** Which pattern toggles a set offers — drives the config-panel switches. */
export function setPatternKinds(setId: string): {
  pokeball: boolean;
  masterball: boolean;
  energy: boolean;
} {
  const r = PATTERN_SETS[setId];
  return { pokeball: !!r?.pokeball, masterball: !!r?.masterball, energy: !!r?.energy };
}

/** Marks Poké Ball / Master Ball / Energy pattern variants on a set's cards, and
 *  clears the plain reverse where the set replaces it with patterns. Each rule
 *  reads the card's ORIGINAL derived `reverse`, so it's order-independent. No-op
 *  for sets without curated patterns.
 *
 *  Applied at READ time (lib/tcg getCards), not baked into the cache, so a set's
 *  binder shows patterns immediately from whatever's cached — no refetch needed.
 *  IDEMPOTENT: if the cards already carry a pattern flag (e.g. a payload cached
 *  by an older build that baked them in), it returns them unchanged. This matters
 *  because the Mega-era rule CLEARS the Pokémon reverse, so a naive second pass
 *  would wrongly drop the patterns it set the first time. */
export function applyBallPatterns(setId: string, cards: TcgCard[]): TcgCard[] {
  const rules = PATTERN_SETS[setId];
  if (!rules) return cards;
  const alreadyApplied = cards.some(
    (c) => c.variants.pokeball === true || c.variants.masterball === true || c.variants.energy === true,
  );
  if (alreadyApplied) return cards;
  return cards.map((card) => ({
    ...card,
    variants: {
      ...card.variants,
      ...(rules.reverse ? { reverse: rules.reverse(card) } : {}),
      pokeball: rules.pokeball ? rules.pokeball(card) : false,
      masterball: rules.masterball ? rules.masterball(card) : false,
      energy: rules.energy ? rules.energy(card) : false,
    },
  }));
}
