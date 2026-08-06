import type { Metadata } from "next";
import Image from "next/image";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { notFound } from "next/navigation";
import { GbLinkButton } from "@/components/gb/gb-button";
import { GbBadge } from "@/components/gb/gb-badge";
import { JsonLd } from "@/components/json-ld";
import { CardThumbStrip } from "@/components/faqs/card-thumb-strip";
import { FaqPageCard } from "@/components/faqs/faq-page-card";
import {
  faqSetIds,
  faqPagesForSet,
  getFaqSetSummary,
  getFaqSetFacts,
} from "@/lib/content/faqs/registry";
import { breadcrumbJsonLd, faqSetHubJsonLd } from "@/lib/structured-data";

type Props = { params: Promise<{ setId: string }> };

// Prerendered, but the "coming soon" badge and the pre-release note below are
// decided from the current date (see lib/content/faqs/registry.ts). Revalidate
// so a build that straddles a set's release date can't pin the wrong copy on
// the hub until the next deploy.
export const revalidate = 3600;

export function generateStaticParams() {
  return faqSetIds.map((setId) => ({ setId }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { setId } = await params;
  const set = getFaqSetSummary(setId);
  if (!set) return { title: "Set FAQs" };
  const title = `${set.fullName} FAQs`;
  // Three states, not two: a set can be out and still have no card data (its
  // pages are hand-authored — see lib/content/faqs/upcoming.ts). Promising
  // master-set sizes and market values for one of those would be a lie, so it
  // gets its own line. `infoHref` is the tell — it only exists with card data.
  const description = set.isUpcoming
    ? `Pre-release answers about ${set.fullName} (Pokémon TCG, ${set.releaseLabel}) — ` +
      "release date, what's in the set, chase cards and more."
    : set.infoHref
      ? `Answers about ${set.fullName} (Pokémon TCG) — how many cards, master set size, the ` +
        "best binder, rarest and most valuable cards, chase cards, release date and more."
      : `Answers about ${set.fullName} (Pokémon TCG, released ${set.releaseLabel}) — ` +
        "what's in the set, the card count, chase cards and products.";
  return {
    title,
    description,
    alternates: { canonical: `/faqs/set/${setId}` },
    openGraph: { type: "website", title, description, url: `/faqs/set/${setId}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** Per-set FAQ hub: every question for one set in one place, reachable from the
 *  /faqs directory card, the set's own /set page and each FAQ's breadcrumb. */
export default async function FaqSetHubPage({ params }: Props) {
  const { setId } = await params;
  const set = getFaqSetSummary(setId);
  if (!set) notFound();
  const pages = faqPagesForSet(setId);
  if (pages.length === 0) notFound();
  const facts = getFaqSetFacts(setId);
  const chase = facts?.chaseCards ?? [];

  const subline = set.isUpcoming
    ? `${set.era} series · expected ${set.releaseLabel} · ${set.faqCount} answers`
    : `${set.era} series${set.releaseDate ? ` · ${set.releaseDate.slice(0, 4)}` : ""} · ${set.faqCount} answers`;

  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
      <JsonLd
        data={[
          faqSetHubJsonLd(setId, set.fullName, pages),
          breadcrumbJsonLd([
            { name: "NOMEKOP", path: "/" },
            { name: "FAQs", path: "/faqs" },
            { name: set.fullName, path: `/faqs/set/${setId}` },
          ]),
        ]}
      />

      <Breadcrumbs parents={[{ url: "/faqs", label: "FAQs" }]} label={`${set.name} FAQs`} />

      <header className="flex flex-col gap-3">
        {set.logoUrl ? (
          <span className="flex h-24 items-center justify-start border-[3px] border-gb-ink bg-gb-bg px-4 py-2">
            <Image
              src={set.logoUrl}
              alt=""
              width={420}
              height={160}
              unoptimized
              loading="lazy"
              className="h-auto max-h-20 w-auto max-w-full object-contain"
            />
          </span>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-pixel text-lg uppercase leading-relaxed sm:text-xl">
            {set.fullName} FAQs
          </h1>
          {set.isUpcoming ? <GbBadge>Coming soon</GbBadge> : null}
        </div>
        <p className="font-readable text-lg leading-snug text-gb-muted">{subline}</p>
      </header>

      {set.isUpcoming ? (
        <p className="border-[3px] border-dashed border-gb-ink bg-gb-accent/20 px-3 py-2 font-readable text-lg leading-snug">
          <strong className="font-bold">{set.name}</strong>{" "}isn&apos;t out yet — these answers are from
          official reveals and TCG news and may change before launch. We&apos;ll swap in full card data
          once it releases.
        </p>
      ) : set.infoHref ? (
        <div className="flex flex-wrap gap-2">
          <GbLinkButton href={set.infoHref} variant="a" size="sm">
            See every {set.name} card ▸
          </GbLinkButton>
          <GbLinkButton href={`/build?set=${set.id}`} variant="b" size="sm">
            Plan a {set.name} binder ▸
          </GbLinkButton>
        </div>
      ) : (
        // Out, but not in the card database — so there's no /set page to link
        // and nothing for /build to lay out. Both buttons would be dead routes
        // (a hand-authored set id like "upcoming-pitch-black" isn't a real set),
        // so say where the answers came from instead.
        <p className="border-[3px] border-dashed border-gb-ink bg-gb-accent/20 px-3 py-2 font-readable text-lg leading-snug">
          <strong className="font-bold">{set.name}</strong>{" "}came out on {set.releaseLabel}. Its cards
          haven&apos;t reached our database yet, so these answers come from Pokémon&apos;s
          announcements. Full card lists and binder layouts follow once the data lands.
        </p>
      )}

      {chase.length > 0 ? (
        <section aria-label={`Chase cards in ${set.name}`} className="flex flex-col gap-2">
          <h2 className="font-pixel text-sm leading-relaxed">Cards from this set</h2>
          <CardThumbStrip cards={chase} limit={6} />
        </section>
      ) : null}

      <section aria-label={`Questions about ${set.fullName}`} className="flex flex-col gap-2">
        <h2 className="font-pixel text-sm leading-relaxed">
          {set.faqCount} questions about {set.name}
        </h2>
        <ul className="flex list-none flex-col gap-2 p-0">
          {pages.map((page) => (
            <FaqPageCard key={page.slug} page={page} />
          ))}
        </ul>
      </section>
    </main>
  );
}
