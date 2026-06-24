import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** generateSitemaps shards the sitemap into /sitemap/<id>.xml files; the
 *  /sitemap_index.xml index (app/sitemap_index.xml/route.ts) lists every shard,
 *  so robots.txt points crawlers at that one index URL rather than enumerating
 *  each shard. (/sitemap.xml is reserved by Next's metadata convention.) */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // API endpoints, print/machine views, device-local collections and
      // shared-binder app-state permutations are not for crawlers.
      disallow: ["/api/", "/print/", "/collection/", "/b/"],
    },
    sitemap: `${base}/sitemap_index.xml`,
  };
}
