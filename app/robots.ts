import type { MetadataRoute } from "next";
import { generateSitemaps } from "@/app/sitemap";
import { siteUrl } from "@/lib/site";

/** generateSitemaps shards the sitemap into /sitemap/<id>.xml files with no
 *  /sitemap.xml index, so robots.txt lists every shard — that is how crawlers
 *  discover them. generateSitemaps already degrades to just "core" offline. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = siteUrl();
  const shards = await generateSitemaps();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // API endpoints, print/machine views, device-local collections and
      // shared-binder app-state permutations are not for crawlers.
      disallow: ["/api/", "/print/", "/collection/", "/b/"],
    },
    sitemap: shards.map(({ id }) => `${base}/sitemap/${id}.xml`),
  };
}
