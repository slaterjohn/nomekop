import snapshot from "@/lib/content/faqs/data.json";
import type {
  FaqEraGroup, FaqPage, FaqSetFacts, FaqSetSummary, FaqSnapshot,
} from "@/lib/content/faqs/types";
import { eraRank } from "@/lib/content/faqs/eras";
import {
  cardCountPage, masterSetPage, secretRaresPage, illustrationRaresPage, reverseHolosPage,
} from "@/lib/content/faqs/templates/counts";
import { rarestCardPage, valuableCardPage, chaseCardsPage } from "@/lib/content/faqs/templates/cards";
import { binderSizePage, releaseDatePage, ballPatternsPage } from "@/lib/content/faqs/templates/sets";
import { pokemonInSetPage } from "@/lib/content/faqs/templates/pokemon";
import {
  UPCOMING_FAQ_PAGES,
  UPCOMING_SETS,
  upcomingSetById,
  upcomingSetsWithPages,
  type UpcomingSet,
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

/** The released-set facts (with card refs + logos) for a set id, when the set
 *  is in the snapshot. Upcoming sets have no facts yet → undefined. */
export function getFaqSetFacts(setId: string): FaqSetFacts | undefined {
  return snap.sets.find((s) => s.id === setId);
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

function releasedSummary(s: FaqSetFacts): FaqSetSummary {
  return {
    id: s.id,
    name: s.name,
    fullName: s.name,
    era: s.series,
    slug: s.slug,
    logoUrl: s.logoUrl || undefined,
    symbolUrl: s.symbolUrl || undefined,
    releaseDate: s.releaseDate,
    faqCount: faqPagesForSet(s.id).length,
    isUpcoming: false,
    hubHref: `/faqs/set/${s.id}`,
    infoHref: `/set/${s.id}`,
  };
}

function upcomingSummary(set: UpcomingSet, order: number): FaqSetSummary {
  return {
    id: set.id,
    name: set.shortName,
    fullName: set.name,
    era: set.era,
    slug: set.slug,
    releaseLabel: set.releaseLabel,
    order,
    faqCount: UPCOMING_FAQ_PAGES.filter((p) => p.setId === set.id).length,
    isUpcoming: true,
    hubHref: `/faqs/set/${set.id}`,
  };
}

/** Every set with FAQ pages (upcoming + released), unified for the index/hub. */
export function faqSetSummaries(): FaqSetSummary[] {
  return [
    ...UPCOMING_SETS.map((set, i) => upcomingSummary(set, i)),
    ...snap.sets.map(releasedSummary),
  ];
}

const SUMMARY_BY_ID = new Map(faqSetSummaries().map((s) => [s.id, s]));

/** The index/hub summary for a set id (released or upcoming). */
export function getFaqSetSummary(setId: string): FaqSetSummary | undefined {
  return SUMMARY_BY_ID.get(setId);
}

/** The newest released set (snapshot is newest-first) — for the home spotlight. */
export function latestReleasedFaqSet(): FaqSetSummary | undefined {
  const first = snap.sets[0];
  return first ? getFaqSetSummary(first.id) : undefined;
}

/** Upcoming sets, soonest release first — for the home "coming soon" section. */
export function upcomingFaqSets(): FaqSetSummary[] {
  return faqSetSummaries().filter((s) => s.isUpcoming);
}

/** Every set id that has a per-set FAQ hub (released + upcoming). */
export const faqSetIds: string[] = faqSetSummaries().map((s) => s.id);

/** Within an era: upcoming sets first (soonest release first), then released
 *  sets newest-first. */
function compareSummaries(a: FaqSetSummary, b: FaqSetSummary): number {
  if (a.isUpcoming !== b.isUpcoming) return a.isUpcoming ? -1 : 1;
  if (a.isUpcoming && b.isUpcoming) return (a.order ?? 0) - (b.order ?? 0);
  return (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "");
}

/** The newest set date in a group — the sort key for unlisted eras. */
function newestDate(sets: FaqSetSummary[]): string {
  return sets.reduce((max, s) => (s.releaseDate && s.releaseDate > max ? s.releaseDate : max), "");
}

/** Sets grouped by era for the FAQ index. Known eras (eras.ts) lead in their
 *  declared order; any unlisted era follows, newest set first. */
export function faqSetsByEra(): FaqEraGroup[] {
  const byEra = new Map<string, FaqSetSummary[]>();
  for (const s of faqSetSummaries()) {
    const members = byEra.get(s.era);
    if (members) members.push(s);
    else byEra.set(s.era, [s]);
  }
  return [...byEra.entries()]
    .map(([era, sets]) => ({ era, sets: [...sets].sort(compareSummaries) }))
    .sort((a, b) => {
      const rank = eraRank(a.era) - eraRank(b.era);
      return rank !== 0 ? rank : newestDate(b.sets).localeCompare(newestDate(a.sets));
    });
}

export { upcomingSetsWithPages };
