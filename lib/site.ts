/** Site-wide identity constants shared by metadata, robots and sitemaps. */

export const SITE_NAME = "Nomekop";

/** Plain-language statement of what the site IS — surfaced on the home page and
 *  used by AI consumers to establish identity before feature detail. */
export const SITE_IDENTITY =
  "NOMEKOP is a free, independent fan-made Pokémon TCG binder layout tool.";

/** ~155 chars — used for the meta description, Open Graph and Twitter cards. */
export const SITE_DESCRIPTION =
  "Pick any Pokemon TCG set and design your binder layout — master sets with reverse holos and ball patterns, printable A4 pages, checklists and card prices.";

/** Canonical public origin (no trailing slash). Configured via
 *  NEXT_PUBLIC_SITE_URL; falls back to the dev server for local builds. */
export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
}
