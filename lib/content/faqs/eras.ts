/**
 * Pokémon TCG "eras" (series families) used to group sets on the FAQ index.
 * Released sets carry a `series` string from the dataset; upcoming sets declare
 * their era in upcoming.ts. The order here is the on-page order (newest era
 * first). Any era not listed sorts after the known ones, by recency — so a new
 * series appears automatically without a code change, just below the known run.
 */
export const ERA_ORDER: readonly string[] = ["Mega Evolution", "Scarlet & Violet"];

/** Position of an era in {@link ERA_ORDER}; unknown eras rank last (but stable). */
export function eraRank(era: string): number {
  const i = ERA_ORDER.indexOf(era);
  return i === -1 ? ERA_ORDER.length : i;
}
