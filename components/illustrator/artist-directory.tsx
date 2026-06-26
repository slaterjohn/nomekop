import Link from "next/link";
import { gatedArtistEntries } from "@/lib/content/entities/catalog";

export type ArtistSort = "cards" | "name" | "sets";

export function parseArtistSort(value: string | undefined): ArtistSort {
  return value === "name" || value === "sets" ? value : "cards";
}

/** Browsable directory of every illustrator with an info page. Default: most
 *  cards first; also A–Z and most-sets. */
export function ArtistDirectory({ sort }: { sort: ArtistSort }) {
  const artists = [...gatedArtistEntries()].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "sets") return b.setCount - a.setCount || b.cardCount - a.cardCount;
    return b.cardCount - a.cardCount || a.name.localeCompare(b.name);
  });

  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-1 p-0 sm:grid-cols-2 lg:grid-cols-3">
      {artists.map((a) => (
        <li key={a.slug}>
          <Link
            href={`/illustrator/${encodeURIComponent(a.slug)}`}
            className="flex h-full flex-col gap-0.5 border-2 border-gb-ink px-2 py-1 no-underline"
          >
            <span className="truncate font-body text-base leading-tight">{a.name}</span>
            <span className="font-pixel text-[8px] text-gb-ink/60">
              {a.cardCount} cards · {a.setCount} sets
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
