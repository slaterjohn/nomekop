import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { GbScreen } from "@/components/gb/gb-screen";
import { JsonLd } from "@/components/json-ld";
import { SetOverlaySelect } from "@/components/sets/set-overlay-select";
import { breadcrumbJsonLd, setsIndexJsonLd } from "@/lib/structured-data";
import { getSets, getSetOverlay } from "@/lib/tcg";
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

/** A localized set sharing an English entry's name — a small chip link to its
 *  binder, badged with the language code. */
function LocalizedBadge({ set }: { set: LocalizedSetRef }) {
  return (
    <Link
      href={`/lset/${set.lang}/${set.localizedId}`}
      aria-label={`${set.name} — ${languageByCode(set.lang)?.label} edition`}
      className="inline-flex shrink-0 items-center gap-1 self-center border-[3px] border-gb-ink bg-gb-accent px-1.5 py-0.5 font-pixel text-[9px] uppercase no-underline"
    >
      {set.lang} ▶
    </Link>
  );
}

/** A localized set with its own (translated) name — interleaved right beside its
 *  English counterpart, or standing alone when language-exclusive. */
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

type Props = { searchParams: Promise<{ lang?: string }> };

/** Crawlable index of every set. ?lang overlays a language (Japanese, French…):
 *  English sets that exist in that language are badged, translated-name sets are
 *  interleaved beside their English entry, and language-exclusive sets get their
 *  own section. */
export default async function SetsIndexPage({ searchParams }: Props) {
  const { lang: langParam } = await searchParams;
  const lang = langParam && isLanguage(langParam) && langParam !== "en" ? langParam : "en";

  const [{ dict }, sets, overlay] = await Promise.all([
    getServerDictionary(),
    getSets(),
    getSetOverlay(lang),
  ]);
  const t = dict.sets;
  const groups = groupBySeries(sets);
  const totalSets = groups.reduce((n, group) => n + group.sets.length, 0);
  const language = languageByCode(lang);
  const cardsLabel = (set: LocalizedSetRef | { total: number }) =>
    format(t.cards, { count: set.total });

  return (
    <main id="main" className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6">
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
          {format(t.intro, { count: totalSets, series: groups.length })}
        </p>
        <p className="mt-1 font-body text-lg">
          <Link href="/facts/biggest-pokemon-tcg-sets" className="underline underline-offset-2">
            {t.biggestLink}
          </Link>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-pixel text-[10px] uppercase">{t.showInLanguage}</span>
        <SetOverlaySelect value={lang} label={t.showInLanguage} />
      </div>

      {lang !== "en" && language ? (
        <p className="font-body text-lg leading-snug">
          {format(t.overlayNote, { language: language.label, code: lang })}
        </p>
      ) : null}

      {groups.map(({ series, sets }) => (
        <GbScreen key={series} title={series.toUpperCase()}>
          <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
            {sets.map((set) => {
              const badge = overlay.badges.get(set.id);
              const variants = overlay.variants.get(set.id) ?? [];
              return (
                <FragmentRow key={set.id}>
                  <li>
                    <div className="flex items-stretch gap-1.5">
                      <Link
                        href={`/set/${set.id}`}
                        className="flex min-h-11 flex-1 items-center gap-2.5 border-[3px] border-gb-ink bg-gb-bg px-2.5 py-1.5 no-underline shadow-[2px_2px_0_0_var(--gb-ink)] motion-safe:transition-transform motion-safe:hover:-translate-y-px"
                      >
                        {set.symbolUrl ? (
                          <Image
                            src={set.symbolUrl}
                            alt=""
                            width={24}
                            height={24}
                            unoptimized
                            loading="lazy"
                            className="h-6 w-6 shrink-0 object-contain"
                          />
                        ) : null}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-pixel text-[10px] leading-relaxed">
                            {set.name.toUpperCase()}
                          </span>
                          <span className="block font-body text-lg leading-none">
                            {format(t.cardsLine, {
                              year: set.releaseDate.slice(0, 4),
                              printed: set.printedTotal,
                              total: set.total,
                            })}
                          </span>
                        </span>
                        <span aria-hidden="true" className="font-pixel text-[10px]">
                          ▶
                        </span>
                      </Link>
                      {badge ? <LocalizedBadge set={badge} /> : null}
                    </div>
                  </li>
                  {variants.map((variant) => (
                    <LocalizedSetRow key={variant.localizedId} set={variant} cards={cardsLabel(variant)} />
                  ))}
                </FragmentRow>
              );
            })}
          </ul>
        </GbScreen>
      ))}

      {overlay.exclusive.length > 0 && language ? (
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

/** Group an English row with its interleaved localized variants without an extra
 *  DOM wrapper (they share the same <ul> grid). */
function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
