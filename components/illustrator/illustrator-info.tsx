import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { GbScreen } from "@/components/gb/gb-screen";
import { GbLinkButton } from "@/components/gb/gb-button";
import { StatGrid, type Stat } from "@/components/entities/stat-grid";
import { EntityCardGallery } from "@/components/entities/entity-card-gallery";
import { EntityFaqSection } from "@/components/entities/entity-faq-section";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/structured-data";
import { artistFaqEntries } from "@/lib/content/entities/faq";
import { getArtistCards } from "@/lib/tcg";
import { encodeIllustratorToken, DEFAULT_ILLUSTRATOR_OPTIONS } from "@/lib/illustrator-binder";
import type { ArtistEntity } from "@/lib/content/entities/types";

/** Big artists (e.g. 5ban Graphics, ~1,700 cards) would render a punishing
 *  number of images; cap the on-page gallery and point to the binder / per-set
 *  pages for the rest, stated plainly (no silent truncation). */
const GALLERY_CAP = 120;

function setLink(set: { id: string; name: string; releaseDate: string }, withYear = false) {
  const label = set.name === "Base" ? "Base Set" : set.name;
  return (
    <Link href={`/set/${set.id}`} className="underline underline-offset-2">
      {label}
      {withYear ? ` (${set.releaseDate.slice(0, 4)})` : ""}
    </Link>
  );
}

/** Illustrator information page (the bare-slug branch of /illustrator/[token]):
 *  stats, FAQs, most-drawn Pokémon, the sets they've appeared in, a sample of
 *  their cards, and shortcuts into the binder + sub-pages. */
export async function IllustratorInfo({ artist }: { artist: ArtistEntity }) {
  const cards = await getArtistCards(artist.slug);
  const sorted = [...cards].sort(
    (a, b) =>
      b.setReleaseDate.localeCompare(a.setReleaseDate) ||
      a.number.localeCompare(b.number, undefined, { numeric: true }),
  );
  const faqs = artistFaqEntries(artist);
  const binderHref = `/illustrator/${encodeIllustratorToken(artist.name, DEFAULT_ILLUSTRATOR_OPTIONS)}`;
  const base = `/illustrator/${encodeURIComponent(artist.slug)}`;

  // Distinct sets this artist appears in, newest first — each its own sub-page.
  const sets = [
    ...new Map(
      sorted.map((c) => [c.setId, { id: c.setId, name: c.setName, releaseDate: c.setReleaseDate }]),
    ).values(),
  ];

  const stats: Stat[] = [
    { label: "Cards", value: artist.cardCount },
    { label: "Sets", value: artist.setCount },
    { label: "Illustration cards", value: artist.illustrationCount },
  ];
  if (artist.earliestSet) stats.push({ label: "First set", value: setLink(artist.earliestSet, true) });
  if (artist.latestSet) stats.push({ label: "Latest set", value: setLink(artist.latestSet) });

  return (
    <main id="main" className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <JsonLd
        data={[
          faqJsonLd(faqs),
          breadcrumbJsonLd([
            { name: "NOMEKOP", path: "/" },
            { name: "Illustrators", path: "/illustrator" },
            { name: artist.name, path: base },
          ]),
        ]}
      />
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-3 font-pixel text-sm uppercase">
        <Link href="/illustrator" className="no-underline">
          ◂ All illustrators
        </Link>
      </nav>

      <header className="flex flex-wrap items-center gap-4">
        {artist.signatureCard?.imageSmall ? (
          <Link href={`/card/${artist.signatureCard.id}`} className="shrink-0 no-underline">
            <Image
              src={artist.signatureCard.imageSmall}
              alt={`${artist.signatureCard.name} by ${artist.name}`}
              width={96}
              height={134}
              unoptimized
              className="h-auto w-24 border-2 border-gb-ink"
            />
          </Link>
        ) : null}
        <div className="min-w-0">
          <p className="font-pixel text-[10px] uppercase leading-relaxed">Illustrator</p>
          <h1 className="font-pixel text-lg uppercase leading-relaxed sm:text-xl">{artist.name}</h1>
          <p className="mt-1 font-body text-lg leading-none">
            {artist.cardCount} cards across {artist.setCount} sets
          </p>
        </div>
      </header>

      <GbScreen title="Stats">
        <StatGrid stats={stats} />
      </GbScreen>

      {artist.topPokemon.length > 0 ? (
        <GbScreen title="Most illustrated Pokémon">
          <ul className="m-0 flex flex-wrap gap-2 p-0">
            {artist.topPokemon.map((p) => (
              <li key={p.slug} className="list-none">
                <Link
                  href={`${base}/pokemon/${encodeURIComponent(p.slug)}`}
                  className="inline-block border-2 border-gb-ink px-2 py-1 font-body text-base no-underline"
                >
                  {p.name} <span className="font-pixel text-[10px]">×{p.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </GbScreen>
      ) : null}

      <EntityFaqSection heading={`Common questions about ${artist.name}`} entries={faqs} />

      <div className="flex flex-wrap gap-2">
        <GbLinkButton variant="a" href={binderHref}>
          Build a {artist.name} binder
        </GbLinkButton>
        {artist.illustrationCount > 0 ? (
          <GbLinkButton variant="b" href={`${base}/illustrations`}>
            Illustration cards ({artist.illustrationCount})
          </GbLinkButton>
        ) : null}
      </div>

      {sets.length > 0 ? (
        <GbScreen title={`Sets (${sets.length})`}>
          <ul className="m-0 flex flex-wrap gap-x-3 gap-y-1 p-0">
            {sets.map((s) => (
              <li key={s.id} className="list-none">
                <Link href={`${base}/set/${s.id}`} className="font-body text-base underline underline-offset-2">
                  {s.name === "Base" ? "Base Set" : s.name}
                </Link>
              </li>
            ))}
          </ul>
        </GbScreen>
      ) : null}

      {sorted.length > 0 ? (
        <GbScreen title={`Cards (${sorted.length})`}>
          {sorted.length > GALLERY_CAP ? (
            <p className="mb-2 font-body text-base leading-snug">
              Showing the {GALLERY_CAP} most recent. Build a binder or browse by set above for all{" "}
              {sorted.length}.
            </p>
          ) : null}
          <EntityCardGallery cards={sorted.slice(0, GALLERY_CAP)} />
        </GbScreen>
      ) : null}
    </main>
  );
}
