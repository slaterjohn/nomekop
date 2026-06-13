import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { GbScreen } from "@/components/gb/gb-screen";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, setsIndexJsonLd } from "@/lib/structured-data";
import { cn } from "@/lib/utils";
import { getSets } from "@/lib/tcg";
import { getLocalizedSets } from "@/lib/tcg/tcgdex";
import { LANGUAGES, isLanguage, languageByCode } from "@/lib/tcg/languages";
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

/** The language switcher tabs (English = pokemontcg.io; the rest = TCGdex). */
function LanguageTabs({ active }: { active: string }) {
  return (
    <nav aria-label="Set language" className="-mx-1 overflow-x-auto">
      <ul className="m-0 flex min-w-max list-none items-stretch gap-1.5 p-1">
        {LANGUAGES.map((language) => {
          const on = language.code === active;
          const href = language.code === "en" ? "/sets" : `/sets?lang=${language.code}`;
          return (
            <li key={language.code}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-9 items-center border-[3px] border-gb-ink px-2.5 py-1 font-pixel text-[10px] no-underline",
                  on ? "bg-gb-ink text-gb-bg" : "bg-gb-bg text-gb-ink",
                )}
              >
                {language.native}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type Props = { searchParams: Promise<{ lang?: string }> };

/** Crawlable index of every set. ?lang switches to a localized set list
 *  (Japanese, French…) from TCGdex — those sets have their own names, artwork
 *  and card counts, so they're shown as separate entries linking to a localized
 *  binder, not merged with the English ones. */
export default async function SetsIndexPage({ searchParams }: Props) {
  const { lang: langParam } = await searchParams;
  const lang = langParam && isLanguage(langParam) && langParam !== "en" ? langParam : "en";

  if (lang !== "en") {
    const language = languageByCode(lang)!;
    let sets: TcgSet[] = [];
    try {
      sets = await getLocalizedSets(lang);
    } catch {
      sets = [];
    }
    return (
      <main id="main" className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6">
        <JsonLd
          data={breadcrumbJsonLd([
            { name: "NOMEKOP", path: "/" },
            { name: "SETS", path: "/sets" },
          ])}
        />
        <div>
          <h1 className="font-pixel text-lg leading-relaxed sm:text-xl">ALL SETS · {language.native}</h1>
          <p className="mt-1 font-body text-lg">
            {sets.length} {language.label} sets from TCGdex — translated names, exclusive artwork,
            their own card counts. Open one to lay it out (no prices for non-English cards).
          </p>
        </div>
        <LanguageTabs active={lang} />
        <GbScreen title={language.label.toUpperCase()}>
          {sets.length === 0 ? (
            <p className="font-body text-xl leading-tight">
              Couldn&apos;t load {language.label} sets right now — try again shortly.
            </p>
          ) : (
            <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
              {sets.map((set) => (
                <li key={set.id}>
                  <Link
                    href={`/lset/${lang}/${set.id}`}
                    className="flex min-h-11 items-center gap-2.5 border-[3px] border-gb-ink bg-gb-bg px-2.5 py-1.5 no-underline shadow-[2px_2px_0_0_var(--gb-ink)] motion-safe:transition-transform motion-safe:hover:-translate-y-px"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-pixel text-[10px] leading-relaxed">
                        {set.name}
                      </span>
                      <span className="block font-body text-lg leading-none">
                        {Math.max(set.printedTotal, set.total)} cards
                      </span>
                    </span>
                    <span aria-hidden="true" className="font-pixel text-[10px]">
                      ▶
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </GbScreen>
      </main>
    );
  }

  const sets = await getSets();
  const groups = groupBySeries(sets);
  const totalSets = groups.reduce((n, group) => n + group.sets.length, 0);

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
        <h1 className="font-pixel text-lg leading-relaxed sm:text-xl">ALL SETS</h1>
        <p className="mt-1 font-body text-lg">
          {totalSets} Pokemon TCG expansions across {groups.length} series — pick one for its card
          list, binder page counts and printables.
        </p>
        <p className="mt-1 font-body text-lg">
          <Link href="/facts/biggest-pokemon-tcg-sets" className="underline underline-offset-2">
            See the biggest sets by card count ▶
          </Link>
        </p>
      </div>
      <LanguageTabs active="en" />

      {groups.map(({ series, sets }) => (
        <GbScreen key={series} title={series.toUpperCase()}>
          <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
            {sets.map((set) => (
              <li key={set.id}>
                <Link
                  href={`/set/${set.id}`}
                  className="flex min-h-11 items-center gap-2.5 border-[3px] border-gb-ink bg-gb-bg px-2.5 py-1.5 no-underline shadow-[2px_2px_0_0_var(--gb-ink)] motion-safe:transition-transform motion-safe:hover:-translate-y-px"
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
                      {set.releaseDate.slice(0, 4)} · {set.printedTotal}/{set.total} cards
                    </span>
                  </span>
                  <span aria-hidden="true" className="font-pixel text-[10px]">
                    ▶
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </GbScreen>
      ))}
    </main>
  );
}
