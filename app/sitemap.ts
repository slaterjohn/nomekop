import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { getCardsForSitemap, getSets, getSetsForSitemap } from "@/lib/tcg";
import { GENERATIONS } from "@/lib/pokedex";
import { ARTICLES } from "@/lib/content/articles";
import { ALL_FAQ_PAGES, faqSetIds } from "@/lib/content/faqs/registry";

/** The overview sitemap (home, /sets, every /set/<id>); the other sitemap ids
 *  are set ids, each listing that set's /card/<cardId> pages. Next serves each
 *  shard at /sitemap/<id>.xml — there is no /sitemap.xml index, so robots.ts
 *  lists every shard URL. */
const CORE_ID = "core";

// Render the shards at request time, not at build. Prerendering them (the
// default for sitemaps) walks every set's cards through the live API during
// `next build`, which made production builds slow and flaky. At runtime each
// shard reads the SQLite cache that the first-launch cache build warms (see
// lib/tcg/cache-manager.ts, scheduled from instrumentation.ts), so the sitemap
// is served instantly from cache while the build stays fast and hermetic.
// Crawler-facing only — end-user pages are unaffected.
export const dynamic = "force-dynamic";

export async function generateSitemaps(): Promise<Array<{ id: string }>> {
  try {
    const sets = await getSets();
    return [{ id: CORE_ID }, ...sets.map((set) => ({ id: set.id }))];
  } catch {
    // No data source (offline build): still publish the core sitemap.
    return [{ id: CORE_ID }];
  }
}

/** 'YYYY/MM/DD' → Date (UTC midnight); undefined when unparsable. */
function parseReleaseDate(releaseDate: string): Date | undefined {
  const date = new Date(releaseDate.replace(/\//g, "-"));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(props: {
  /** Next 16 passes a Promise<string>; tests may pass a plain string. */
  id: string | Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = await props.id;
  const base = siteUrl();

  if (id === CORE_ID) {
    const staticEntries: MetadataRoute.Sitemap = [
      { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
      // /sets is the set-browsing entry. Bare /build now 308-redirects here, so
      // it's no longer listed (a sitemap shouldn't carry a redirecting URL).
      { url: `${base}/sets`, changeFrequency: "weekly", priority: 0.9 },
      { url: `${base}/pokedex`, changeFrequency: "monthly", priority: 0.8 },
      { url: `${base}/pokemon`, changeFrequency: "monthly", priority: 0.8 },
      { url: `${base}/illustrator`, changeFrequency: "monthly", priority: 0.8 },
      { url: `${base}/legal`, changeFrequency: "yearly", priority: 0.3 },
      { url: `${base}/facts`, changeFrequency: "monthly", priority: 0.6 },
      ...ARTICLES.map((article) => ({
        url: `${base}/facts/${article.slug}`,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
      // Each article's Markdown companion (also linked from llms.txt and the
      // article page) — surfaced here so crawlers discover it at crawl time.
      ...ARTICLES.map((article) => ({
        url: `${base}/facts/${article.slug}/markdown`,
        changeFrequency: "monthly" as const,
        priority: 0.4,
      })),
      { url: `${base}/faqs`, changeFrequency: "monthly" as const, priority: 0.6 },
      // Per-set FAQ hubs (released + upcoming) — the set cards on /faqs link here.
      ...faqSetIds.map((setId) => ({
        url: `${base}/faqs/set/${setId}`,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
      ...ALL_FAQ_PAGES.flatMap((page) => [
        {
          url: `${base}/faqs/${page.slug}`,
          changeFrequency: "monthly" as const,
          priority: 0.5,
        },
        {
          url: `${base}/faqs/${page.slug}/markdown`,
          changeFrequency: "monthly" as const,
          priority: 0.3,
        },
      ]),
      // One canonical (default-token) Pokédex per generation.
      ...GENERATIONS.map((gen) => ({
        url: `${base}/pokedex/${gen.id}~34`,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ];
    try {
      const sets = await getSetsForSitemap();
      return [
        ...staticEntries,
        ...sets.map((set) => ({
          url: `${base}/set/${set.id}`,
          lastModified: parseReleaseDate(set.releaseDate),
          changeFrequency: "monthly" as const,
          priority: 0.7,
        })),
      ];
    } catch {
      // A build/runtime without the API must not 500 the sitemap.
      return staticEntries;
    }
  }

  try {
    const cards = await getCardsForSitemap(id);
    return cards.map((card) => ({
      url: `${base}/card/${card.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));
  } catch {
    // Unknown set, or cards not yet warmed in the cache (fixture mode covers
    // only three sets) — serve an empty shard rather than block on a fetch.
    return [];
  }
}
