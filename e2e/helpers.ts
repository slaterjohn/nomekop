import type { Page } from "@playwright/test";

/** Keep e2e hermetic: every card-CDN request gets the local stub PNG. */
export async function stubCardImages(page: Page): Promise<void> {
  await page.route("https://images.pokemontcg.io/**", (route) =>
    route.fulfill({ path: "public/card-stub.png" }),
  );
}

/** Selects sv1 via the set search UI. */
export async function chooseScarletViolet(page: Page): Promise<void> {
  await page.getByRole("combobox", { name: /search sets/i }).fill("scarlet & violet");
  await page.locator("[cmdk-item]", { hasText: "258 cards" }).click();
  await page.getByRole("heading", { name: "PREVIEW" }).waitFor();
  // the address bar now carries the share token
  await page.waitForURL(/\/b\/sv1~/);
}
