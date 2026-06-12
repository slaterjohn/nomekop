import { POCKET_PRESETS } from "@/lib/config";

// Vault X binder recommendations (lineup verified June 2026: Zip and Strap
// lines in 4/9/12/16-pocket sizes). Links are search URLs — robust against
// product-page churn — and carry optional affiliate parameters from env.

export type BinderProduct = {
  name: string;
  pockets: number;
  line: "Exo-Tec Zip" | "Strap";
  /** Approximate RRP shown as guidance, not a live price. */
  priceGuide: string;
};

const PRODUCTS: BinderProduct[] = [
  { name: "Vault X 4-Pocket Exo-Tec Zip Binder", pockets: 4, line: "Exo-Tec Zip", priceGuide: "£15.99+" },
  { name: "Vault X 4-Pocket Strap Binder", pockets: 4, line: "Strap", priceGuide: "£9.99" },
  { name: "Vault X 9-Pocket Exo-Tec Zip Binder", pockets: 9, line: "Exo-Tec Zip", priceGuide: "£22.99+" },
  { name: "Vault X 9-Pocket Strap Binder", pockets: 9, line: "Strap", priceGuide: "£14.99" },
  { name: "Vault X 12-Pocket Exo-Tec Zip Binder", pockets: 12, line: "Exo-Tec Zip", priceGuide: "£27.99+" },
  { name: "Vault X 12-Pocket Strap Binder", pockets: 12, line: "Strap", priceGuide: "£16.99" },
  { name: "Vault X 16-Pocket Exo-Tec Zip Binder", pockets: 16, line: "Exo-Tec Zip", priceGuide: "£42.99+" },
];

/** Products matching the layout's pocket count; nearest size when custom. */
export function bindersFor(pockets: number): { exact: boolean; products: BinderProduct[] } {
  const exact = PRODUCTS.filter((p) => p.pockets === pockets);
  if (exact.length > 0) return { exact: true, products: exact };
  const sizes = [...new Set(PRODUCTS.map((p) => p.pockets))];
  const nearest = sizes.reduce((best, size) =>
    Math.abs(size - pockets) < Math.abs(best - pockets) ? size : best,
  );
  return { exact: false, products: PRODUCTS.filter((p) => p.pockets === nearest) };
}

export function vaultxUrl(product: BinderProduct): string {
  const ref = process.env.NEXT_PUBLIC_VAULTX_REF;
  const url = new URL("https://vaultx.com/search");
  url.searchParams.set("q", `${product.pockets} pocket ${product.line.toLowerCase()} binder`);
  if (ref) url.searchParams.set("ref", ref);
  return url.toString();
}

export function amazonUrl(product: BinderProduct): string {
  const url = new URL("https://www.amazon.co.uk/s");
  url.searchParams.set("k", product.name);
  const tag = process.env.NEXT_PUBLIC_AMAZON_TAG;
  if (tag) url.searchParams.set("tag", tag);
  return url.toString();
}

export function hasAffiliateLinks(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_AMAZON_TAG || process.env.NEXT_PUBLIC_VAULTX_REF);
}

/** Vault X Exo-Tec Zip binders hold 20 double-sided sleeves = 40 binder pages. */
export const ZIP_BINDER_PAGES = 40;

export type BinderRecommendation = {
  label: string;
  pockets: number;
  rows: number;
  cols: number;
  /** Pages this layout needs for the given slot count. */
  pages: number;
  /** Number of 40-page zip binders required. */
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
 * 40-page zip binder (highest page utilisation while still fitting). When no
 * size fits one binder, fall back to 12-pocket and report the binder count.
 */
export function recommendPreset(slots: number): BinderRecommendation {
  const evaluated = evaluatePresets(slots);
  const fitting = evaluated.filter((e) => e.fits);
  if (fitting.length > 0) {
    return fitting.reduce((best, e) => (e.pages > best.pages ? e : best));
  }
  return evaluated.find((e) => e.pockets === 12) ?? evaluated[evaluated.length - 1]!;
}
