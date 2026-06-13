import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { stubCardImages } from "./helpers";

test.beforeEach(async ({ page }) => {
  await stubCardImages(page);
  await page.route("https://images.scrydex.com/**", (route) =>
    route.fulfill({ path: "public/card-stub.png" }),
  );
});

test("illustrator binder: search → token URL → heading", async ({ page }) => {
  await page.goto("/illustrator");
  await page.getByLabel(/illustrator name/i).fill("Ken Sugimori");
  await page.getByRole("button", { name: /build binder/i }).click();
  await expect(page).toHaveURL(/\/illustrator\/ken-sugimori~34n$/);

  await expect(page.getByRole("heading", { name: /KEN SUGIMORI BINDER/i })).toBeVisible();
  await expect(page.getByText(/pockets →/i)).toBeVisible();

  // oldest-first ordering flips the token
  await page.getByRole("option", { name: /oldest first/i }).click();
  await expect(page).toHaveURL(/\/illustrator\/ken-sugimori~34o$/);
});

test("illustrator binder PDF honours the token", async ({ page }) => {
  test.setTimeout(120_000);
  // Mitsuhiro Arita drew 19 base-set cards in the fixtures.
  const res = await page.request.post("/api/pdf", {
    data: { type: "illustrator", token: "mitsuhiro-arita~22n" },
    timeout: 120_000,
  });
  expect(res.status()).toBe(200);
  const doc = await PDFDocument.load(await res.body());
  expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);

  const bad = await page.request.post("/api/pdf", {
    data: { type: "illustrator", token: "not-a-token" },
  });
  expect(bad.status()).toBe(400);
});
