import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { getCards, getSets } from "@/lib/tcg";

/** The overview sitemap (home, /sets, every /set/<id>); the other sitemap ids
 *  are set ids, each listing that set's /card/<cardId> pages. Next serves each
 *  shard at /sitemap/<id>.xml — there is no /sitemap.xml index, so robots.ts
 *  lists every shard URL. */
const CORE_ID = "core";

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
      { url: `${base}/sets`, changeFrequency: "weekly", priority: 0.9 },
    ];
    try {
      const sets = await getSets();
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
    const cards = await getCards(id);
    return cards.map((card) => ({
      url: `${base}/card/${card.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));
  } catch {
    // Unknown set or unreachable API (fixture mode covers only three sets).
    return [];
  }
}
