import { compareCardNumbers } from "@/lib/layout/number";
import { LANGUAGE_CODES } from "@/lib/tcg/languages";
import type { CardWithSet } from "@/lib/tcg/types";

export type BinderOrder = "new" | "old";

/** English first, then the canonical language order; unknown languages last. */
function langRank(lang: string | undefined): number {
  const i = LANGUAGE_CODES.indexOf(lang ?? "en");
  return i < 0 ? LANGUAGE_CODES.length : i;
}

/**
 * Order cards for a binder.
 *
 * Single language: by release date, then card number — the long-standing order.
 *
 * Multiple languages: the same set's prints scatter if you sort by raw release
 * date (a Japanese set ships months before its English twin). So cluster by the
 * canonical (English) set instead — same set's cards land together across every
 * language, English first — putting each card beside its other-language editions.
 */
export function orderForBinder(
  cards: ReadonlyArray<CardWithSet>,
  order: BinderOrder,
  multiLanguage: boolean,
): CardWithSet[] {
  if (!multiLanguage) {
    return [...cards].sort((a, b) => {
      const byDate = a.setReleaseDate.localeCompare(b.setReleaseDate);
      if (byDate !== 0) return order === "new" ? -byDate : byDate;
      return compareCardNumbers(a.number, b.number);
    });
  }
  return [...cards].sort((a, b) => {
    const byDate = (a.canonDate ?? a.setReleaseDate).localeCompare(b.canonDate ?? b.setReleaseDate);
    if (byDate !== 0) return order === "new" ? -byDate : byDate;
    // Same release era → keep one set's cards together across languages…
    const setA = a.canonSetId ?? a.setId;
    const setB = b.canonSetId ?? b.setId;
    if (setA !== setB) return setA.localeCompare(setB);
    // …English first within the set, then by card number.
    const byLang = langRank(a.lang) - langRank(b.lang);
    if (byLang !== 0) return byLang;
    return compareCardNumbers(a.number, b.number);
  });
}
