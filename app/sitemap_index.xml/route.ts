import { getSets } from "@/lib/tcg";
import { siteUrl } from "@/lib/site";

// The sitemap INDEX at /sitemap_index.xml: one document listing every shard the
// sitemap generates (/sitemap/<id>.xml — the core overview plus one per set),
// each with a <lastmod> so Googlebot can skip re-fetching unchanged shards.
// Next 16's generateSitemaps produces the shards but no index, and it reserves
// /sitemap.xml for the metadata convention, so the index lives here and
// robots.txt points crawlers at it. Rendered at request time so a cold cache
// can't fail it.
export const dynamic = "force-dynamic";

/** Escape the five XML entities — values are URLs / dates, but a <loc> must be
 *  valid XML. */
function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** "2025/01/17" → "2025-01-17" (W3C date for <lastmod>); undefined if unparsable. */
function lastmod(releaseDate: string | undefined): string | undefined {
  if (!releaseDate) return undefined;
  const iso = releaseDate.replace(/\//g, "-");
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : undefined;
}

function entry(loc: string, mod?: string): string {
  return (
    `  <sitemap>\n    <loc>${xml(loc)}</loc>\n` +
    (mod ? `    <lastmod>${mod}</lastmod>\n` : "") +
    `  </sitemap>`
  );
}

export async function GET(): Promise<Response> {
  const base = siteUrl();
  let sets: Array<{ id: string; releaseDate: string }> = [];
  try {
    sets = await getSets();
  } catch {
    // Offline/cold cache: still publish the core shard.
  }
  // Core shard's lastmod tracks the newest set (it lists every /set/ page).
  const newest = sets.reduce<string | undefined>(
    (acc, s) => (!acc || s.releaseDate > acc ? s.releaseDate : acc),
    undefined,
  );
  const entries = [
    entry(`${base}/sitemap/core.xml`, lastmod(newest)),
    ...sets.map((s) => entry(`${base}/sitemap/${s.id}.xml`, lastmod(s.releaseDate))),
  ].join("\n");
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${entries}\n` +
    `</sitemapindex>\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
