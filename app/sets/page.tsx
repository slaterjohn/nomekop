import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { GbScreen } from "@/components/gb/gb-screen";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, setsIndexJsonLd } from "@/lib/structured-data";
import { cn } from "@/lib/utils";
import { getSets, getSetOverlay } from "@/lib/tcg";
import { LANGUAGES, isLanguage, languageByCode, languageLabel } from "@/lib/tcg/languages";
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

/** The language overlay switcher — English plus every TCGdex language. Selecting
 *  one augments (not replaces) the English list with that language's sets. */
function LanguageTabs({ active }: { active: string }) {
  return (
    <nav aria-label="Overlay language" className="-mx-1 overflow-x-auto">
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
                {languageLabel(language.code)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
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
function LocalizedSetRow({ set }: { set: LocalizedSetRef }) {
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
          <span className="block font-body text-lg leading-none">{set.total} cards</span>
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

  const sets = await getSets();
  const groups = groupBySeries(sets);
  const totalSets = groups.reduce((n, group) => n + group.sets.length, 0);
  const overlay = await getSetOverlay(lang);
  const language = languageByCode(lang);

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
      <LanguageTabs active={lang} />
      {lang !== "en" && language ? (
        <p className="font-body text-lg leading-snug">
          Showing {language.label} sets from TCGdex. A{" "}
          <span className="font-pixel text-[10px] uppercase">{lang}</span> badge marks an English
          set that also exists in {language.label}; translated names sit beside their English
          entry; {language.label}-only sets are listed at the end. No prices for non-English cards.
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
                            {set.releaseDate.slice(0, 4)} · {set.printedTotal}/{set.total} cards
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
                    <LocalizedSetRow key={variant.localizedId} set={variant} />
                  ))}
                </FragmentRow>
              );
            })}
          </ul>
        </GbScreen>
      ))}

      {overlay.exclusive.length > 0 && language ? (
        <GbScreen title={`${language.label.toUpperCase()}-ONLY SETS`}>
          <p className="mb-2 font-body text-lg leading-tight">
            {overlay.exclusive.length} sets released only in {language.label} — no English edition.
          </p>
          <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
            {overlay.exclusive.map((set) => (
              <LocalizedSetRow key={set.localizedId} set={set} />
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
