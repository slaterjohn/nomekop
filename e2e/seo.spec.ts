import { test, expect } from "@playwright/test";
import { stubCardImages } from "./helpers";

test.beforeEach(async ({ page }) => {
  await stubCardImages(page);
});

async function jsonLdBlocks(page: import("@playwright/test").Page): Promise<unknown[]> {
  const raw = await page.locator('script[type="application/ld+json"]').allTextContents();
  return raw.flatMap((t) => {
    const parsed = JSON.parse(t) as unknown;
    return Array.isArray(parsed) ? parsed : [parsed];
  });
}

const types = (blocks: unknown[]) =>
  blocks.map((b) => (b as { "@type"?: string })["@type"]).filter(Boolean);

test("home ships WebSite/WebApplication/FAQPage JSON-LD and a visible FAQ", async ({ page }) => {
  await page.goto("/");
  const blocks = await jsonLdBlocks(page);
  expect(types(blocks)).toEqual(expect.arrayContaining(["WebSite", "WebApplication", "FAQPage"]));
  // FAQPage content must mirror visible content (Google policy)
  await expect(page.getByText("What is a Pokemon master set?")).toBeVisible();
  await expect(page.getByRole("heading", { name: "HOW BINDERMON WORKS" })).toBeVisible();
});

test("set hub is crawlable: /sets → /set/base1 → card links", async ({ page }) => {
  await page.goto("/sets");
  await expect(page.locator('a[href="/set/base1"]')).toBeVisible();
  await page.goto("/set/base1");
  const cardLinks = page.locator('a[href^="/card/base1-"]');
  await expect(cardLinks).toHaveCount(102);
  const blocks = await jsonLdBlocks(page);
  expect(types(blocks)).toEqual(expect.arrayContaining(["CollectionPage", "BreadcrumbList"]));
});

test("card pages emit Product JSON-LD with honest offers", async ({ page }) => {
  await page.goto("/card/base1-4");
  const blocks = await jsonLdBlocks(page);
  const product = blocks.find((b) => (b as { "@type"?: string })["@type"] === "Product") as {
    name?: string;
    offers?: { "@type"?: string; lowPrice?: string; highPrice?: string };
    sku?: string;
  };
  expect(product).toBeTruthy();
  expect(product.name).toContain("Charizard");
  expect(product.sku).toBe("base1-4");
  expect(product.offers?.["@type"]).toBe("AggregateOffer");
  expect(Number(product.offers?.lowPrice)).toBeLessThanOrEqual(Number(product.offers?.highPrice));
  expect(types(blocks)).toContain("BreadcrumbList");
});

test("robots.txt and sitemap shards serve correctly", async ({ page }) => {
  const robots = await page.request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  const body = await robots.text();
  for (const path of ["/api/", "/print/", "/collection/", "/b/"]) {
    expect(body).toContain(`Disallow: ${path}`);
  }
  expect(body).toMatch(/Sitemap: .*\/sitemap\/core\.xml/);

  const core = await page.request.get("/sitemap/core.xml");
  expect(core.status()).toBe(200);
  const coreXml = await core.text();
  expect(coreXml).toContain("/sets");
  expect(coreXml).toContain("/set/base1");

  const shard = await page.request.get("/sitemap/base1.xml");
  expect(shard.status()).toBe(200);
  expect(await shard.text()).toContain("/card/base1-4");
});

test("canonicals and noindex flags are in the rendered HTML", async ({ page }) => {
  await page.goto("/card/base1-4");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/card\/base1-4$/);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /Charizard/);

  await page.goto("/collection/base1");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  await page.goto("/b/base1~34s111ic");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});
