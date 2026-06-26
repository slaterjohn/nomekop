import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { SetOverlaySelect } from "@/components/sets/set-overlay-select";
import { SetsBrowser, type SetsGroup, type SetsBrowserLabels } from "@/components/sets/sets-browser";
import { TrailRecorder } from "@/components/breadcrumbs";
import { GbScreen } from "@/components/gb/gb-screen";
import { breadcrumbJsonLd, setsIndexJsonLd } from "@/lib/structured-data";
import { getSets, getSetOverlay } from "@/lib/tcg";
import { getMasterSetCounts } from "@/lib/tcg/master-count";
import { isSeriesVerified } from "@/lib/tcg/era-coverage";
import { cardLanguagesEnabled } from "@/lib/features";
import { isLanguage, languageByCode } from "@/lib/tcg/languages";
import { getServerDictionary } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/format";
import type { LocalizedSetRef } from "@/lib/sets-overlay";
import type { TcgSet } from "@/lib/tcg/types";

// Sets come from a third-party API via our cache — always render dynamically
// so a build without network (or with a cold cache) cannot fail.
export const dynamic = "force-dynamic";

const TITLE = "All Pokemon TCG sets";
const DESCRIPTION =
  "Every Pokemon TCG expansion by series — base sets to the newest releases. Card lists, binder page counts, prices and printable A4 layouts for each set.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/sets" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/sets" },
};

type SeriesGroup = {
  series: string;
  /** Release date of the series' newest set — the series sort key. */
  newest: string;
  sets: TcgSet[];
};

/** Newest series first; sets newest-first within each series. */
function groupBySeries(sets: TcgSet[]): SeriesGroup[] {
  const bySeries = new Map<string, TcgSet[]>();
  for (const set of sets) {
    const members = bySeries.get(set.series);
    if (members) members.push(set);
    else bySeries.set(set.series, [set]);
  }
  const groups = [...bySeries.entries()].map(([series, members]) => {
    const sorted = [...members].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
    return { series, newest: sorted[0]?.releaseDate ?? "", sets: sorted };
  });
  return groups.sort((a, b) => b.newest.localeCompare(a.newest));
}

/** A localized set with its own (translated) name — a chip link to its binder,
 *  shown in the language-overlay section below the browser. */
function LocalizedSetRow({ set, cards }: { set: LocalizedSetRef; cards: string }) {
  return (
    <li>
      <Link
        href={`/lset/${set.lang}/${set.localizedId}`}
        className="flex min-h-11 items-center gap-2.5 border-[3px] border-dashed border-gb-ink bg-gb-bg px-2.5 py-1.5 no-underline shadow-[2px_2px_0_0_var(--gb-ink)] motion-safe:transition-transform motion-safe:hover:-translate-y-px"
      >
        <span aria-hidden="true" className="font-pixel text-[10px] uppercase">
          {set.lang}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-pixel text-[10px] leading-relaxed">{set.name}</span>
          <span className="block font-body text-lg leading-none">{cards}</span>
        </span>
        <span aria-hidden="true" className="font-pixel text-[10px]">
          ▶
        </span>
      </Link>
    </li>
  );
}

type Props = { searchParams: Promise<{ lang?: string; q?: string }> };

/** Crawlable index of every set. The default English view is an interactive
 *  browser (search + collapsible series + click-to-modal) that still renders a
 *  real <a href="/set/[id]"> per set for crawlers. ?lang overlays a language
 *  (Japanese, French…): the localized/translated/exclusive sets are listed in a
 *  reference section below the browser. */
export default async function SetsIndexPage({ searchParams }: Props) {
  const { lang: langParam, q: queryParam } = await searchParams;
  const lang =
    cardLanguagesEnabled() && langParam && isLanguage(langParam) && langParam !== "en"
      ? langParam
      : "en";

  const [{ dict }, sets, overlay] = await Promise.all([
    getServerDictionary(),
    getSets(),
    getSetOverlay(lang),
  ]);
  const t = dict.sets;
  const seriesGroups = groupBySeries(sets);
  const masterCounts = await getMasterSetCounts(sets);
  const totalSets = seriesGroups.reduce((n, group) => n + group.sets.length, 0);
  const language = languageByCode(lang);

  // Serializable groups for the client browser (already newest-first).
  const groups: SetsGroup[] = seriesGroups.map((group) => ({
    series: group.series,
    verified: isSeriesVerified(group.series),
    sets: group.sets.map((set) => ({
      id: set.id,
      name: set.name,
      series: set.series,
      releaseDate: set.releaseDate,
      printedTotal: set.printedTotal,
      total: set.total,
      masterCount: masterCounts.get(set.id) ?? Math.max(set.printedTotal, set.total),
      symbolUrl: set.symbolUrl,
      logoUrl: set.logoUrl,
    })),
  }));

  const labels: SetsBrowserLabels = {
    masterCards: t.masterCards,
    searchPlaceholder: t.searchPlaceholder,
    searchLabel: t.searchLabel,
    searchClear: t.searchClear,
    noResults: t.noResults,
    resultCount: t.resultCount,
    expandSection: t.expandSection,
    collapseSection: t.collapseSection,
    setCount: t.setCount,
    viewInfo: t.viewInfo,
    createLayout: t.createLayout,
    modalClose: t.modalClose,
    seriesLabel: t.seriesLabel,
    releasedLabel: t.releasedLabel,
    countsLabel: t.countsLabel,
    printedTotalLine: t.printedTotalLine,
    masterSetLabel: t.masterSetLabel,
    accuracyDisclaimer: dict.accuracy.disclaimer,
    accuracyReportCta: dict.accuracy.reportCta,
  };

  // Localized overlay sets (badged English sets, translated-name sets, and
  // language-exclusive sets), flattened into one reference list for the
  // ?lang view — newest-first by the order series come in.
  const localizedRefs: LocalizedSetRef[] =
    lang !== "en"
      ? [
          ...seriesGroups.flatMap((group) =>
            group.sets.flatMap((set) => {
              const badge = overlay.badges.get(set.id);
              const variants = overlay.variants.get(set.id) ?? [];
              return badge ? [badge, ...variants] : variants;
            }),
          ),
        ]
      : [];

  const cardsLabel = (set: LocalizedSetRef) => format(t.cards, { count: set.total });

  return (
    <main id="main" className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6">
      <TrailRecorder label="All sets" />
      <JsonLd
        data={[
          setsIndexJsonLd(sets),
          breadcrumbJsonLd([
            { name: "NOMEKOP", path: "/" },
            { name: "SETS", path: "/sets" },
          ]),
        ]}
      />
      <div>
        <h1 className="font-pixel text-lg uppercase leading-relaxed sm:text-xl">{t.title}</h1>
        <p className="mt-1 font-body text-lg">
          {format(t.intro, { count: totalSets, series: seriesGroups.length })}
        </p>
        <p className="mt-1 font-body text-lg">
          <Link href="/facts/biggest-pokemon-tcg-sets" className="underline underline-offset-2">
            {t.biggestLink}
          </Link>
        </p>
      </div>

      {cardLanguagesEnabled() ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-pixel text-[10px] uppercase">{t.showInLanguage}</span>
          <SetOverlaySelect value={lang} label={t.showInLanguage} />
        </div>
      ) : null}

      {lang !== "en" && language ? (
        <p className="font-body text-lg leading-snug">
          {format(t.overlayNote, { language: language.label, code: lang })}
        </p>
      ) : null}

      <SetsBrowser groups={groups} labels={labels} initialQuery={queryParam ?? ""} />

      {lang !== "en" && language && localizedRefs.length > 0 ? (
        <GbScreen title={language.label.toUpperCase()}>
          <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
            {localizedRefs.map((ref) => (
              <LocalizedSetRow key={`${ref.lang}-${ref.localizedId}`} set={ref} cards={cardsLabel(ref)} />
            ))}
          </ul>
        </GbScreen>
      ) : null}

      {lang !== "en" && overlay.exclusive.length > 0 && language ? (
        <GbScreen title={format(t.exclusiveHeading, { language: language.label }).toUpperCase()}>
          <p className="mb-2 font-body text-lg leading-tight">
            {format(t.exclusiveNote, { count: overlay.exclusive.length, language: language.label })}
          </p>
          <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
            {overlay.exclusive.map((set) => (
              <LocalizedSetRow key={set.localizedId} set={set} cards={cardsLabel(set)} />
            ))}
          </ul>
        </GbScreen>
      ) : null}
    </main>
  );
}
