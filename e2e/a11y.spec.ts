import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { stubCardImages } from "./helpers";

const THEMES = ["dmg", "pocket", "kanto-red", "cerulean", "high-contrast"] as const;

for (const theme of THEMES) {
  test(`axe clean in ${theme} (home + configured builder)`, async ({ page }) => {
    await stubCardImages(page);
    await page.addInitScript(
      ([key, value]) => localStorage.setItem(key!, value!),
      ["bindermon:v1:theme", theme],
    );

    await page.goto("/");
    await page.getByRole("heading", { level: 1, name: /BUILD THE PERFECT BINDER/ }).waitFor();
    const homeScan = await new AxeBuilder({ page }).analyze();
    expect(homeScan.violations).toEqual([]);

    await page.goto("/b/sv1~34m111ic");
    await page.getByRole("heading", { name: "PREVIEW" }).waitFor();
    const builderScan = await new AxeBuilder({ page }).analyze();
    expect(builderScan.violations).toEqual([]);
  });
}

test("reduced motion collapses animations", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "reduced-motion", "runs in the reduced-motion project");
  await stubCardImages(page);
  await page.goto("/b/sv1~34s111ic");
  await page.getByRole("heading", { name: "PREVIEW" }).waitFor();

  const durations = await page.evaluate(() => {
    const els = [
      document.querySelector("[data-gb-spread]"),
      document.querySelector('[data-gb-cursor="visible"]'),
    ].filter(Boolean) as Element[];
    return els.map((el) => getComputedStyle(el).animationDuration);
  });
  expect(durations.length).toBeGreaterThan(0);
  for (const d of durations) {
    // Chromium may serialize 0.01ms as "1e-05s"; compare in seconds.
    const seconds = d.endsWith("ms") ? Number.parseFloat(d) / 1000 : Number.parseFloat(d);
    expect(seconds).toBeLessThan(0.001);
  }
});
