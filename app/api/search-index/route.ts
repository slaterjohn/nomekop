import { NextResponse } from "next/server";
import { getSetsForSitemap } from "@/lib/tcg";
import { pokemonCatalog, gatedArtistEntries } from "@/lib/content/entities/catalog";
import { ALL_FAQ_PAGES } from "@/lib/content/faqs/registry";
import { ARTICLES } from "@/lib/content/articles";
import type { SearchEntry } from "@/lib/search/types";

// Compact site-search index, assembled from the cache-only set list + the
// committed catalogs + the FAQ registry + facts. The client fetches this once
// (lib/search/use-search-index.ts) and searches it locally. Reads the live cache
// (never the API), so it stays fresh; cached at the edge via Cache-Control.
export const dynamic = "force-dynamic";

const seoSetName = (name: string) => (name === "Base" ? "Base Set" : name);

export async function GET() {
  const entries: SearchEntry[] = [];

  for (const p of pokemonCatalog()) {
    entries.push({
      type: "pokemon",
      label: p.name,
      sublabel: `#${String(p.dex).padStart(4, "0")}`,
      url: `/pokemon/${encodeURIComponent(p.slug)}`,
    });
  }

  try {
    for (const s of await getSetsForSitemap()) {
      const year = s.releaseDate ? s.releaseDate.slice(0, 4) : "";
      entries.push({
        type: "set",
        label: seoSetName(s.name),
        sublabel: year ? `${s.series} · ${year}` : s.series,
        url: `/set/${s.id}`,
      });
    }
  } catch {
    // No warmed cache (offline build / cold start) — ship the rest.
  }

  for (const a of gatedArtistEntries()) {
    entries.push({
      type: "artist",
      label: a.name,
      sublabel: `${a.cardCount} cards`,
      url: `/illustrator/${encodeURIComponent(a.slug)}`,
    });
  }

  for (const f of ALL_FAQ_PAGES) {
    entries.push({ type: "faq", label: f.question, url: `/faqs/${f.slug}` });
  }

  for (const a of ARTICLES) {
    entries.push({ type: "fact", label: a.question, url: `/facts/${a.slug}` });
  }

  return NextResponse.json(
    { entries },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
