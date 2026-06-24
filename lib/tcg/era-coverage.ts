/**
 * Which eras (pokemontcg.io `series`) have VERIFIED master-set counts.
 *
 * A 66-set research sweep (2026-06-24, cross-checked against PokéCottage / Binder
 * Forge / PokéBeach master-set guides) covered exactly these four most-recent
 * eras — 100% curated coverage in `data/master-counts.json`. Every other era is
 * 0% curated and falls back to the heuristic slot count, which is close for plain
 * sets but can miss special-pattern variants. Those eras carry an accuracy
 * disclaimer on the binder/set pages and a link to report inaccuracies.
 */
export const VERIFIED_SERIES = [
  "Mega Evolution",
  "Scarlet & Violet",
  "Sword & Shield",
  "Sun & Moon",
] as const;

const VERIFIED = new Set<string>(VERIFIED_SERIES);

/** True when the era's master-set counts have been verified against collector
 *  guides (so no accuracy disclaimer is needed). */
export function isSeriesVerified(series: string): boolean {
  return VERIFIED.has(series);
}
