import { test, expect } from "@playwright/test";

test("home page responds with a main landmark", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main")).toBeVisible();
});
