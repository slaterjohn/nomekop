import { JsonLd } from "@/components/json-ld";
import { GbScreen } from "@/components/gb/gb-screen";
import { GbDialogBox } from "@/components/gb/gb-dialog-box";
import { EntityCardGallery } from "@/components/entities/entity-card-gallery";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { breadcrumbJsonLd } from "@/lib/structured-data";
import type { CardWithSet } from "@/lib/tcg/types";

/** Shared shell for an illustrator sub-page (illustrations-only, per-set,
 *  per-Pokémon): a breadcrumb back to the artist, a heading, and the filtered
 *  card gallery. Cards are shown newest set first. */
export function ArtistCardsSubpage({
  artistName,
  artistSlug,
  title,
  subtitle,
  cards,
}: {
  artistName: string;
  artistSlug: string;
  title: string;
  subtitle?: string;
  cards: ReadonlyArray<CardWithSet>;
}) {
  const base = `/illustrator/${encodeURIComponent(artistSlug)}`;
  const sorted = [...cards].sort(
    (a, b) =>
      b.setReleaseDate.localeCompare(a.setReleaseDate) ||
      a.number.localeCompare(b.number, undefined, { numeric: true }),
  );

  return (
    <main id="main" className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "NOMEKOP", path: "/" },
            { name: "Illustrators", path: "/illustrator" },
            { name: artistName, path: base },
            { name: title, path: base },
          ]),
        ]}
      />
      <Breadcrumbs
        parents={[
          { url: "/illustrator", label: "All illustrators" },
          { url: base, label: artistName },
        ]}
        label={title}
      />

      <header className="min-w-0">
        <h1 className="font-pixel text-lg uppercase leading-relaxed sm:text-xl">{title}</h1>
        {subtitle ? <p className="mt-1 font-body text-lg leading-none">{subtitle}</p> : null}
      </header>

      {sorted.length > 0 ? (
        <GbScreen title={`Cards (${sorted.length})`}>
          <EntityCardGallery cards={sorted} />
        </GbScreen>
      ) : (
        <GbDialogBox>No cards here yet.</GbDialogBox>
      )}
    </main>
  );
}
