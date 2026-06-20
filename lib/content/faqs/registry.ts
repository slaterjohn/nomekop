import snapshot from "@/lib/content/faqs/data.json";
import type { FaqPage, FaqSetFacts, FaqSnapshot } from "@/lib/content/faqs/types";
import {
  cardCountPage, masterSetPage, secretRaresPage, illustrationRaresPage, reverseHolosPage,
} from "@/lib/content/faqs/templates/counts";
import { rarestCardPage, valuableCardPage, chaseCardsPage } from "@/lib/content/faqs/templates/cards";
import { binderSizePage, releaseDatePage, ballPatternsPage } from "@/lib/content/faqs/templates/sets";
import { pokemonInSetPage } from "@/lib/content/faqs/templates/pokemon";
import {
  UPCOMING_FAQ_PAGES,
  upcomingSetById,
  upcomingSetsWithPages,
} from "@/lib/content/faqs/upcoming";

const snap = snapshot as unknown as FaqSnapshot;

export const FAQ_AS_OF = snap.asOf;
export const FAQ_SETS: FaqSetFacts[] = snap.sets;

function pagesForSetFacts(s: FaqSetFacts): FaqPage[] {
  const pages: FaqPage[] = [
    cardCountPage(s),
    masterSetPage(s),
    binderSizePage(s),
    rarestCardPage(s),
    chaseCardsPage(s),
    secretRaresPage(s),
    illustrationRaresPage(s),
    reverseHolosPage(s),
    releaseDatePage(s),
  ];
  if (s.mostValuableCard) pages.push(valuableCardPage(s));
  if (s.hasBallPatterns) pages.push(ballPatternsPage(s));
  for (const p of s.marqueePokemon) pages.push(pokemonInSetPage(s, p));
  return pages;
}

const upcomingSlugs = new Set(UPCOMING_FAQ_PAGES.map((p) => p.slug));

/** Released-set pages (data-driven from the snapshot). Any slug a hand-authored
 *  upcoming page already owns is dropped so the pre-release page wins until it's
 *  pruned — this keeps slugs unique even after a set releases into the DB. */
export const FAQ_PAGES: FaqPage[] = snap.sets
  .flatMap(pagesForSetFacts)
  .filter((p) => !upcomingSlugs.has(p.slug));

/** Every FAQ page for routing/sitemap — upcoming (hand-authored) first. */
export const ALL_FAQ_PAGES: FaqPage[] = [...UPCOMING_FAQ_PAGES, ...FAQ_PAGES];

const BY_SLUG = new Map(ALL_FAQ_PAGES.map((p) => [p.slug, p]));
export const faqSlugs: string[] = ALL_FAQ_PAGES.map((p) => p.slug);

export function getFaqPage(slug: string): FaqPage | undefined {
  return BY_SLUG.get(slug);
}

export function faqPagesForSet(setId: string): FaqPage[] {
  return ALL_FAQ_PAGES.filter((p) => p.setId === setId);
}

/** Display name for a set id — released (snapshot) or upcoming. */
export function faqSetName(setId: string): string | undefined {
  const released = snap.sets.find((s) => s.id === setId);
  return released ? released.name : upcomingSetById(setId)?.shortName;
}

/** Released sets, newest first, each with its pages — for the grouped index. */
export function faqSetsWithPages(): { set: FaqSetFacts; pages: FaqPage[] }[] {
  return snap.sets.map((set) => ({ set, pages: faqPagesForSet(set.id) }));
}

export { upcomingSetsWithPages };
