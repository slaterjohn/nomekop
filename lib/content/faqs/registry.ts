import snapshot from "@/lib/content/faqs/data.json";
import type { FaqPage, FaqSetFacts, FaqSnapshot } from "@/lib/content/faqs/types";
import {
  cardCountPage, masterSetPage, secretRaresPage, illustrationRaresPage, reverseHolosPage,
} from "@/lib/content/faqs/templates/counts";
import { rarestCardPage, valuableCardPage, chaseCardsPage } from "@/lib/content/faqs/templates/cards";
import { binderSizePage, releaseDatePage, ballPatternsPage } from "@/lib/content/faqs/templates/sets";
import { pokemonInSetPage } from "@/lib/content/faqs/templates/pokemon";

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

export const FAQ_PAGES: FaqPage[] = snap.sets.flatMap(pagesForSetFacts);

const BY_SLUG = new Map(FAQ_PAGES.map((p) => [p.slug, p]));
export const faqSlugs: string[] = FAQ_PAGES.map((p) => p.slug);

export function getFaqPage(slug: string): FaqPage | undefined {
  return BY_SLUG.get(slug);
}

export function faqPagesForSet(setId: string): FaqPage[] {
  return FAQ_PAGES.filter((p) => p.setId === setId);
}

/** Sets in scope, newest first, each with its pages — for the grouped index. */
export function faqSetsWithPages(): { set: FaqSetFacts; pages: FaqPage[] }[] {
  return snap.sets.map((set) => ({ set, pages: faqPagesForSet(set.id) }));
}
