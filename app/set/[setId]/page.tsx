import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GbLinkButton } from "@/components/gb/gb-button";
import { GbScreen } from "@/components/gb/gb-screen";
import { JsonLd } from "@/components/json-ld";
import { DEFAULT_CONFIG } from "@/lib/config";
import { buildBinderLayout, sortCards } from "@/lib/layout";
import { evaluatePresets, recommendPreset, ZIP_BINDER_PAGES } from "@/lib/binders";
import { GbBadge } from "@/components/gb/gb-badge";
import { encodeShareToken } from "@/lib/share";
import { breadcrumbJsonLd, setCollectionJsonLd } from "@/lib/structured-data";
import { faqPagesForSet } from "@/lib/content/faqs/registry";
import { AccuracyDisclaimer } from "@/components/accuracy-disclaimer";
import { getCards, getSets } from "@/lib/tcg";
import { isSeriesVerified } from "@/lib/tcg/era-coverage";
import { TcgError } from "@/lib/tcg/types";
import { getServerDictionary } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/format";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ setId: string }>;
};

const SET_ID_RE = /^[a-z0-9.]+$/i;

/** Shared by generateMetadata and the page body — cache() dedupes the fetch
 *  so both run off a single sets+cards lookup per request. */
const loadSet = cache(async (setId: string) => {
  if (!SET_ID_RE.test(setId)) notFound();
  try {
    const [sets, cards] = await Promise.all([getSets(), getCards(setId)]);
    const set = sets.find((s) => s.id === setId);
    if (!set || cards.length === 0) notFound();
    return { set, cards };
  } catch (err) {
    if (err instanceof TcgError && err.kind === "unknown-set") notFound();
    throw err;
  }
});

/** The name people actually search. The pokemontcg.io name for the 1999 base set
 *  is the bare word "Base"; everyone calls it "Base Set", so align titles + H1 to
 *  that for keyword match. Other set names are already the searched form. */
function seoSetName(name: string): string {
  return name === "Base" ? "Base Set" : name;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { setId } = await params;
  const { set } = await loadSet(setId);
  const name = seoSetName(set.name);
  const title = `${name} card list & binder layout (${set.printedTotal} cards)`;
  const description =
    `${name} — Pokemon TCG expansion from the ${set.series} series ` +
    `(${set.releaseDate.slice(0, 4)}) with ${set.printedTotal} cards. ` +
    "See every card, current prices, and print A4 binder pages and checklists.";
  return {
    title,
    description,
    alternates: { canonical: `/set/${setId}` },
    openGraph: { title, description, url: `/set/${setId}` },
  };
}

function pageCount(n: number): string {
  return `${n} ${n === 1 ? "page" : "pages"}`;
}

/** Set landing hub: stats, builder shortcuts and a link to every card —
 *  the server-rendered trail crawlers follow to reach /card/[cardId]. */
export default async function SetPage({ params }: Props) {
  const { dict } = await getServerDictionary();
  const { setId } = await params;
  const { set, cards } = await loadSet(setId);
  const faqs = faqPagesForSet(setId);

  const standard = buildBinderLayout(cards, set, DEFAULT_CONFIG);
  const master = buildBinderLayout(cards, set, { ...DEFAULT_CONFIG, mode: "master" });
  // Recommend the layout that best fills one 40-page Vault X zip binder
  // with the COMPLETE (master) set.
  const recommended = recommendPreset(master.stats.slots);
  const fitTable = evaluatePresets(master.stats.slots);
  const builderHref = `/b/${encodeShareToken({
    ...DEFAULT_CONFIG,
    set: set.id,
    rows: recommended.rows,
    cols: recommended.cols,
  })}`;
  const masterHref = `/b/${encodeShareToken({
    ...DEFAULT_CONFIG,
    set: set.id,
    mode: "master",
    rows: recommended.rows,
    cols: recommended.cols,
  })}`;
  const sorted = sortCards(cards);

  return (
    <main id="main" className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <JsonLd
        data={[
          setCollectionJsonLd(set, sorted),
          breadcrumbJsonLd([
            { name: "NOMEKOP", path: "/" },
            { name: "SETS", path: "/sets" },
            { name: set.name, path: `/set/${set.id}` },
          ]),
        ]}
      />
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-3 font-pixel text-sm uppercase">
        <Link href="/sets" className="no-underline">
          ◂ All sets
        </Link>
      </nav>

      <header className="flex flex-wrap items-center gap-3">
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
        <div className="min-w-0">
          <h1 className="font-pixel text-lg leading-relaxed sm:text-xl">{seoSetName(set.name).toUpperCase()}</h1>
          <p className="mt-1 font-body text-lg leading-none">
            {format(dict.setDetail.cardsLine, {
              series: set.series,
              year: set.releaseDate.slice(0, 4),
              printed: set.printedTotal,
              total: set.total,
            })}
          </p>
        </div>
      </header>

      {/* Only when the count is genuinely uncertain: an unverified era AND the set
          actually has reverse holos (whose counts the API doesn't expose). Sets
          with no reverses — Base, Jungle, Fossil — have a trivially correct count,
          so the "may be inaccurate" banner would just be noise there. */}
      {!isSeriesVerified(set.series) && master.stats.byKind.reverse > 0 ? (
        <AccuracyDisclaimer
          body={dict.accuracy.disclaimer}
          reportCta={dict.accuracy.reportCta}
          era={set.series}
          setId={set.id}
        />
      ) : null}

      <GbScreen title={dict.setDetail.binderLayouts}>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="border-[3px] border-gb-ink px-3 py-2">
              <p className="font-pixel text-[10px] uppercase leading-relaxed">{dict.setDetail.standardSet}</p>
              <p className="font-body text-xl leading-tight">
                {pageCount(standard.stats.pages)} · {standard.stats.slots} pockets
              </p>
            </div>
            <div className="border-[3px] border-gb-ink px-3 py-2">
              <p className="font-pixel text-[10px] uppercase leading-relaxed">{dict.setDetail.masterSet}</p>
              <p className="font-body text-xl leading-tight">
                {pageCount(master.stats.pages)} · {master.stats.slots} pockets
              </p>
            </div>
          </div>
          <p className="font-body text-lg leading-none">
            Page counts for a 12-pocket binder (3×4) — adjust grid, secrets and variants in the
            builder.
          </p>

          <table className="w-full border-[3px] border-gb-ink" aria-label={dict.setDetail.binderFit}>
            <thead>
              <tr className="bg-gb-accent font-pixel text-[9px] uppercase">
                <th scope="col" className="px-2 py-1.5 text-left">
                  Binder
                </th>
                <th scope="col" className="px-2 py-1.5 text-right">
                  Master pages
                </th>
                <th scope="col" className="px-2 py-1.5 text-right">
                  Fits one binder?
                </th>
              </tr>
            </thead>
            <tbody className="font-body text-lg">
              {fitTable.map((row) => (
                <tr key={row.label} className="border-t-2 border-gb-ink/30">
                  <td className="px-2 py-1.5">
                    {row.label} ({row.rows}×{row.cols})
                    {row.label === recommended.label ? (
                      <GbBadge className="ml-2">{dict.setDetail.recommended}</GbBadge>
                    ) : null}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{row.pages}</td>
                  <td className="px-2 py-1.5 text-right">
                    {row.fits ? `yes — ${row.pages}/${ZIP_BINDER_PAGES} pages` : `needs ${row.binders} binders`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="font-body text-base leading-snug">
            Fit assumes a Vault X Exo-Tec zip binder (20 double-sided sleeves = {ZIP_BINDER_PAGES}{" "}
            pages); the recommendation best fills a single binder with the complete master set.
          </p>
          <div className="flex flex-wrap gap-2">
            <GbLinkButton variant="a" href={builderHref}>
              {dict.setDetail.openInBuilder}
            </GbLinkButton>
            <GbLinkButton variant="b" href={masterHref}>
              {dict.setDetail.masterSetLayout}
            </GbLinkButton>
          </div>
        </div>
      </GbScreen>

      <GbScreen title={`Card list (${cards.length})`}>
        <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-5 md:grid-cols-6">
          {sorted.map((card) => (
            <li key={card.id}>
              <Link href={`/card/${card.id}`} className="flex h-full flex-col gap-1 no-underline">
                {card.imageSmall ? (
                  <Image
                    src={card.imageSmall}
                    alt={`${card.name} · ${card.number}/${set.printedTotal}`}
                    width={245}
                    height={342}
                    unoptimized
                    loading="lazy"
                    className="h-auto w-full border-2 border-gb-ink"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex aspect-[63/88] items-center justify-center border-2 border-dashed border-gb-muted p-1 text-center font-pixel text-[8px] uppercase leading-relaxed"
                  >
                    No scan
                  </span>
                )}
                <span className="block truncate font-body text-base leading-tight">
                  {card.name}
                </span>
                <span className="block font-pixel text-[8px] leading-none">#{card.number}</span>
              </Link>
            </li>
          ))}
        </ul>
      </GbScreen>

      {faqs.length > 0 && (
        <section aria-label={`Common questions about ${set.name}`} className="mt-6 flex flex-col gap-2">
          <h2 className="font-pixel text-sm leading-relaxed">Common questions about {set.name}</h2>
          <ul className="flex list-none flex-col gap-1 p-0">
            {faqs.slice(0, 6).map((page) => (
              <li key={page.slug}>
                <Link href={`/faqs/${page.slug}`} className="font-body text-lg underline underline-offset-2">
                  {page.question}
                </Link>
              </li>
            ))}
          </ul>
          <GbLinkButton href={`/faqs/set/${set.id}`} variant="b" size="sm" className="mt-1 self-start">
            All {set.name} FAQs ({faqs.length}) ▸
          </GbLinkButton>
        </section>
      )}
    </main>
  );
}
