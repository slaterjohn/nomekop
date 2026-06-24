import { generateSitemaps } from "@/app/sitemap";
import { siteUrl } from "@/lib/site";

// The sitemap INDEX at /sitemap_index.xml: one document listing every shard
// generateSitemaps emits (/sitemap/<id>.xml — the core overview plus one per
// set). Next 16's generateSitemaps produces the shards but no index, and it
// reserves /sitemap.xml for the metadata convention, so the index lives at the
// conventional /sitemap_index.xml and robots.txt points crawlers there.
// Rendered at request time (like the shards) so a cold cache can't fail it.
export const dynamic = "force-dynamic";

/** Escape the five XML entities — set ids are `[a-z0-9.]` and the origin is a
 *  plain URL, so this is belt-and-braces, but a <loc> must be valid XML. */
function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(): Promise<Response> {
  const base = siteUrl();
  const shards = await generateSitemaps();
  const entries = shards
    .map(({ id }) => `  <sitemap>\n    <loc>${xml(`${base}/sitemap/${id}.xml`)}</loc>\n  </sitemap>`)
    .join("\n");
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${entries}\n` +
    `</sitemapindex>\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Crawler-facing; let the CDN hold it briefly so a crawl burst doesn't
      // re-walk the set list every hit.
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
