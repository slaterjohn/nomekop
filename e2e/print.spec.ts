import { test, expect } from "@playwright/test";
import { stubCardImages } from "./helpers";

test.beforeEach(async ({ page }) => {
  await stubCardImages(page);
});

test("binder print route renders 12 sheets for base1 3×3", async ({ page }) => {
  await page.goto("/print/binder?set=base1");
  await expect(page.locator(".print-sheet")).toHaveCount(12);
  await expect(page.getByText("Page 1/12 · 3×3")).toBeVisible();
  await expect(page.locator(".print-slot-label").first()).toContainText("Alakazam");
});

test("checklist renders one tick row per pocket", async ({ page }) => {
  await page.goto("/print/checklist?set=base1");
  await expect(page.locator(".print-tickbox")).toHaveCount(102);
  await expect(page.locator(".print-sheet")).toHaveCount(4);
});

test("master-mode checklist includes reverse rows", async ({ page }) => {
  await page.goto("/print/checklist?set=sv1&mode=master");
  await expect(page.locator(".print-tickbox")).toHaveCount(444);
  await expect(page.getByText("Reverse holo").first()).toBeVisible();
});

test("placeholders render true-size cells with crop marks", async ({ page }) => {
  await page.goto("/print/placeholders?set=base1");
  await expect(page.locator(".print-placeholder")).toHaveCount(102);
  await expect(page.locator(".print-sheet")).toHaveCount(17);
  await expect(page.locator(".print-crop-tl")).toHaveCount(102);
});

test("retro style flips print typography", async ({ page }) => {
  await page.goto("/print/binder?set=base1&style=retro");
  await expect(page.locator(".print-root.print-retro")).toHaveCount(1);
});

test("unknown set 404s", async ({ page }) => {
  const res = await page.goto("/print/binder?set=doesnotexist");
  expect(res!.status()).toBe(404);
});

test("binder sheet visual golden (local only)", async ({ page }) => {
  test.skip(!!process.env.CI, "golden generated on darwin; CI relies on DOM assertions");
  await page.goto("/print/binder?set=base1");
  await page.locator(".print-sheet").first().waitFor();
  await expect(page.locator(".print-sheet").first()).toHaveScreenshot("binder-sheet-1.png", {
    maxDiffPixelRatio: 0.02,
  });
});
