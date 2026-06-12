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
