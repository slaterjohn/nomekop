import { POCKET_PRESETS } from "@/lib/config";
import catalogue from "@/data/binders.json";

// Binder catalogue + recommendation logic. The data lives in data/binders.json
// so links, prices and the product list can be updated (or extended to other
// brands/retailers) without touching code — see that file's _comment.

export type Retailer = {
  id: string;
  name: string;
  /** Query param the affiliate code is appended as (e.g. "tag" for Amazon). */
  affiliateParam: string;
  /** Env var holding the affiliate code; absent/unset → plain links. */
  affiliateEnv: string;
};

export type BinderLink = {
  /** Retailer id (matches a Retailer). */
  retailer: string;
  url: string;
};

export type Binder = {
  id: string;
  brand: string;
  name: string;
  pockets: number;
  line: string;
  /** Pages the binder physically holds (for "how many binders" maths). */
  capacityPages: number;
  /** Approximate RRP shown as guidance, not a live price. */
  priceGuide: string;
  blurb: string;
  links: BinderLink[];
};

const RETAILERS: Retailer[] = catalogue.retailers;
export const BINDERS: Binder[] = catalogue.binders;
/** A zip binder physically holds this many pages (20 double-sided sleeves). */
export const ZIP_BINDER_PAGES: number = catalogue.pagesPerZipBinder;

export function retailerById(id: string): Retailer | undefined {
  return RETAILERS.find((r) => r.id === id);
}

/** A shop link with its affiliate code appended when the env var is set. */
export function affiliateUrl(link: BinderLink): string {
  const retailer = retailerById(link.retailer);
  const code = retailer ? process.env[retailer.affiliateEnv] : undefined;
  if (!retailer || !code) return link.url;
  try {
    const url = new URL(link.url);
    url.searchParams.set(retailer.affiliateParam, code);
    return url.toString();
  } catch {
    return link.url;
  }
}

export function retailerName(id: string): string {
  return retailerById(id)?.name ?? id;
}

/** True when any retailer has an affiliate code configured (drives disclosure). */
export function hasAffiliateLinks(): boolean {
  return RETAILERS.some((r) => Boolean(process.env[r.affiliateEnv]));
}

/** Binders matching the layout's pocket count; nearest size when custom. */
export function bindersFor(pockets: number): { exact: boolean; products: Binder[] } {
  const exact = BINDERS.filter((b) => b.pockets === pockets);
  if (exact.length > 0) return { exact: true, products: exact };
  const sizes = [...new Set(BINDERS.map((b) => b.pockets))];
  const nearest = sizes.reduce((best, size) =>
    Math.abs(size - pockets) < Math.abs(best - pockets) ? size : best,
  );
  return { exact: false, products: BINDERS.filter((b) => b.pockets === nearest) };
}

export type BinderRecommendation = {
  label: string;
  pockets: number;
  rows: number;
  cols: number;
  /** Pages this layout needs for the given slot count. */
  pages: number;
  /** Number of zip binders required. */
  binders: number;
  fits: boolean;
};

function evaluatePreset(
  preset: (typeof POCKET_PRESETS)[number],
  slots: number,
): BinderRecommendation {
  const pages = Math.max(1, Math.ceil(slots / preset.pockets));
  const binders = Math.ceil(pages / ZIP_BINDER_PAGES);
  return { ...preset, pages, binders, fits: binders === 1 };
}

export function evaluatePresets(slots: number): BinderRecommendation[] {
  return POCKET_PRESETS.map((p) => evaluatePreset(p, slots));
}

/**
 * The recommended binder size for a set: the layout that best FILLS a single
 * zip binder (highest page utilisation while still fitting). When no size fits
 * one binder, fall back to 12-pocket and report the binder count.
 */
export function recommendPreset(slots: number): BinderRecommendation {
  const evaluated = evaluatePresets(slots);
  const fitting = evaluated.filter((e) => e.fits);
  if (fitting.length > 0) {
    return fitting.reduce((best, e) => (e.pages > best.pages ? e : best));
  }
  return evaluated.find((e) => e.pockets === 12) ?? evaluated[evaluated.length - 1]!;
}
