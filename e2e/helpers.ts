import type { Page } from "@playwright/test";

/** Keep e2e hermetic: every card-CDN request gets the local stub PNG. */
export async function stubCardImages(page: Page): Promise<void> {
  await page.route("https://images.pokemontcg.io/**", (route) =>
    route.fulfill({ path: "public/card-stub.png" }),
  );
}

/** Opens the Scarlet & Violet (sv1) builder in its default config. Set browsing
 *  now lives on /sets; the builder is entered by share token, so we jump straight
 *  to sv1's default token (standard mode, 12-pocket grid). */
export async function chooseScarletViolet(page: Page): Promise<void> {
  await page.goto("/b/sv1~34s111ic");
  await page.getByRole("heading", { name: "Preview" }).waitFor();
  await page.waitForURL(/\/b\/sv1~/);
}
