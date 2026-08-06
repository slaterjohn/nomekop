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
  ANNOUNCED_FAQ_PAGES,
  ANNOUNCED_SETS,
  announcedSetById,
  announcedSetsWithPages,
  hasReleased,
  todayIso,
  type AnnouncedSet,
} from "@/lib/content/faqs/upcoming";

const snap = snapshot as unknown as FaqSnapshot;

export const FAQ_AS_OF = snap.asOf;
export const FAQ_SETS: FaqSetFacts[] = snap.sets;

function pagesForSetFacts(s: FaqSetFacts): FaqPage[] {
  // Always-applicable pages.
  const pages: FaqPage[] = [
    cardCountPage(s),
    binderSizePage(s),
    rarestCardPage(s),
    chaseCardsPage(s),
    releaseDatePage(s),
  ];
  // Feature-gated pages — only emit when the figure is non-zero, so a "flat"
  // set (e.g. Celebrations: no reverse holos, no secret rares, master = base)
  // doesn't get pages that would just answer "0".
  if (s.masterSetCount > s.printedTotal) pages.push(masterSetPage(s));
  if (s.secretCount > 0) pages.push(secretRaresPage(s));
  if (s.illustrationRareCount > 0) pages.push(illustrationRaresPage(s));
  if (s.reverseHoloCount > 0) pages.push(reverseHolosPage(s));
  if (s.mostValuableCard) pages.push(valuableCardPage(s));
  if (s.hasBallPatterns) pages.push(ballPatternsPage(s));
  for (const p of s.marqueePokemon) pages.push(pokemonInSetPage(s, p));
  return pages;
}

const handAuthoredSlugs = new Set(ANNOUNCED_FAQ_PAGES.map((p) => p.slug));

const rawReleased = snap.sets
  .flatMap(pagesForSetFacts)
  .filter((p) => !handAuthoredSlugs.has(p.slug));
const rawAll = [...ANNOUNCED_FAQ_PAGES, ...rawReleased];

// Every slug that actually renders. Templates cross-link by bare slug, and
// feature-gated pages (master-set, secret-rares, …) may not exist for a given
// set — so drop any internal FAQ link whose target wasn't generated. App routes
// (/set, /card, /build) and external URLs are left untouched.
const generatedSlugs = new Set(rawAll.map((p) => p.slug));
const isInternalFaqLink = (href: string) => !/^(https?:|\/)/.test(href);
function pruneRelated(page: FaqPage): FaqPage {
  const related = page.related.filter(
    (r) => !isInternalFaqLink(r.href) || generatedSlugs.has(r.href),
  );
  return related.length === page.related.length ? page : { ...page, related };
}

/** Released-set pages (data-driven from the snapshot). Any slug a hand-authored
 *  page already owns is dropped so the hand-authored page wins until it's
 *  pruned — this keeps slugs unique even after a set releases into the DB. */
export const FAQ_PAGES: FaqPage[] = rawReleased.map(pruneRelated);

/**
 * Every FAQ page for routing/sitemap — hand-authored first.
 *
 * Deliberately module-scope and date-independent. A hand-authored set's pages
 * must keep resolving after its release date passes: they're indexed URLs, and
 * expiring the page set would 404 them the moment the clock rolled over. Only
 * the "is this still coming soon?" presentation below is date-driven.
 */
export const ALL_FAQ_PAGES: FaqPage[] = rawAll.map(pruneRelated);

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
  return released ? released.name : announcedSetById(setId)?.shortName;
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

/**
 * WHERE "NOW" COMES FROM — read this before changing any signature below.
 *
 * Whether a hand-authored set still counts as "coming soon" is decided by
 * comparing its ISO `releaseDate` against today, so a released set drops off the
 * home page and out of the upcoming grouping without anyone editing a file.
 *
 * Every function that needs that answer takes an optional `now` (epoch ms) and
 * falls back to `Date.now()` INSIDE the call — the same shape as
 * `runCacheCheck()` in lib/tcg/cache-manager.ts, for the same reason. A
 * module-scope `Date.now()` (or a module-scope Map built from one, which is what
 * `SUMMARY_BY_ID` used to be) is evaluated once per process. On a long-running
 * `next start` server that pins the list to whenever the server booted; in a
 * prerender it bakes build day into the HTML. Either way a set that released
 * yesterday sits under "Coming soon" until someone redeploys — the exact bug
 * this replaced.
 *
 * Two follow-on consequences:
 *  - The page-level exports above (ALL_FAQ_PAGES, faqSlugs) and `faqSetIds`
 *    below stay date-independent, so a released set keeps its pages and its hub
 *    route. Expiry is about presentation, never about routing.
 *  - `/faqs` and `/faqs/set/[setId]` are statically prerendered, so their HTML
 *    is only as fresh as the last render no matter where the clock is read.
 *    Both carry `export const revalidate` so a build that straddles a release
 *    date can't pin stale copy until the next deploy. The home page is
 *    force-dynamic and needs no help.
 */
function announcedSummary(set: AnnouncedSet, today: string, order: number): FaqSetSummary {
  const isUpcoming = !hasReleased(set, today);
  return {
    id: set.id,
    name: set.shortName,
    fullName: set.name,
    era: set.era,
    slug: set.slug,
    // Once it's out, hand it a real releaseDate (the summary's YYYY/MM/DD form)
    // so it sorts among the released sets. It still has no logoUrl or infoHref:
    // those come from card data, and a hand-authored set has none by definition.
    releaseDate: isUpcoming ? undefined : set.releaseDate.replaceAll("-", "/"),
    releaseLabel: set.releaseLabel,
    order: isUpcoming ? order : undefined,
    faqCount: ANNOUNCED_FAQ_PAGES.filter((p) => p.setId === set.id).length,
    isUpcoming,
    hubHref: `/faqs/set/${set.id}`,
  };
}

/** Every set with FAQ pages (hand-authored + released), unified for the
 *  index/hub. `now` defaults to the current time — see the note above. */
export function faqSetSummaries(now: number = Date.now()): FaqSetSummary[] {
  const today = todayIso(now);
  return [
    ...ANNOUNCED_SETS.map((set, i) => announcedSummary(set, today, i)),
    ...snap.sets.map(releasedSummary),
  ];
}

/** The index/hub summary for a set id (released or upcoming). */
export function getFaqSetSummary(setId: string, now: number = Date.now()): FaqSetSummary | undefined {
  return faqSetSummaries(now).find((s) => s.id === setId);
}

/** The newest released set (snapshot is newest-first) — for the home spotlight. */
export function latestReleasedFaqSet(now: number = Date.now()): FaqSetSummary | undefined {
  const first = snap.sets[0];
  return first ? getFaqSetSummary(first.id, now) : undefined;
}

/** Sets still ahead of today, soonest release first — the home "coming soon"
 *  section. Returns [] once every announced set has shipped, which hides the
 *  section rather than showing stale entries. */
export function upcomingFaqSets(now: number = Date.now()): FaqSetSummary[] {
  return faqSetSummaries(now).filter((s) => s.isUpcoming);
}

/** Every set id that has a per-set FAQ hub. Date-independent on purpose: a
 *  hand-authored set keeps its hub after release, so generateStaticParams
 *  covers it either way. */
export const faqSetIds: string[] = [
  ...ANNOUNCED_SETS.map((s) => s.id),
  ...snap.sets.map((s) => s.id),
];

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
export function faqSetsByEra(now: number = Date.now()): FaqEraGroup[] {
  const byEra = new Map<string, FaqSetSummary[]>();
  for (const s of faqSetSummaries(now)) {
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

export { announcedSetsWithPages };
