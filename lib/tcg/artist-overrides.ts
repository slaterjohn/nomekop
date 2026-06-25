import data from "@/data/artist-overrides.json";
import type { TcgCard } from "@/lib/tcg/types";

// Committed illustrator credits for cards whose source (pokemontcg.io) ships no
// artist field — currently several recent sets (Prismatic Evolutions, Surging
// Sparks, …). Sourced from TCGdex by scripts/backfill-artists.mjs.
//
// Applied at READ time (lib/tcg getCards + the card index), exactly like
// applyBallPatterns: durable across cache refetches, reviewable in git, and
// SELF-HEALING — it only fills a blank credit, so when the API eventually adds
// the field the override silently becomes a no-op.

const OVERRIDES: Record<string, string> = (data as { overrides?: Record<string, string> }).overrides ?? {};

/** Fill missing `artist` credits from the override map. Returns the same array
 *  when nothing changed. Never overwrites an existing credit. */
export function applyArtistOverrides(
  cards: TcgCard[],
  overrides: Record<string, string> = OVERRIDES,
): TcgCard[] {
  let changed = false;
  const out = cards.map((c) => {
    if (c.artist && String(c.artist).trim()) return c;
    const credit = overrides[c.id];
    if (!credit) return c;
    changed = true;
    return { ...c, artist: credit };
  });
  return changed ? out : cards;
}
