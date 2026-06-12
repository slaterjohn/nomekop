/** Site-wide identity constants shared by metadata, robots and sitemaps. */

export const SITE_NAME = "Nomekop";

/** ~155 chars — used for the meta description, Open Graph and Twitter cards. */
export const SITE_DESCRIPTION =
  "Pick any Pokemon TCG set and design your binder layout — master sets with reverse holos and ball patterns, printable A4 pages, checklists and card prices.";

/** Canonical public origin (no trailing slash). Configured via
 *  NEXT_PUBLIC_SITE_URL; falls back to the dev server for local builds. */
export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
}
