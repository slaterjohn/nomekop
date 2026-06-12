import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { chooseScarletViolet, stubCardImages } from "./helpers";

test.beforeEach(async ({ page }) => {
  await stubCardImages(page);
});

test("full happy path: choose, configure, master mode, tick, persist", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "CHOOSE SET" })).toBeVisible();

  await chooseScarletViolet(page);
  await expect(page).toHaveURL(/set=sv1/);

  // 4×3 grid via stepper
  await page.getByRole("button", { name: "Increase ROWS" }).click();
  await expect(page.getByRole("spinbutton", { name: "ROWS" })).toHaveAttribute("aria-valuenow", "4");

  // master mode interleaves reverses: 258 + 186 = 444 pockets over 37 pages
  await page.getByRole("option", { name: /MASTER/ }).click();
  await expect(page.getByText("258 CARDS → 444 POCKETS → 37 PAGES")).toBeVisible();
  await expect(page).toHaveURL(/mode=master/);
  await expect(page.getByText("REV").first()).toBeVisible();

  // flip pages
  await page.getByRole("button", { name: "Next pages" }).click();
  await expect(page.getByText(/PAGES 2–3 OF 37/)).toBeVisible();

  // tick three cards
  await page.getByRole("switch", { name: "TICK MODE" }).click();
  const boxes = page.getByRole("checkbox");
  // regression: tick buttons once collapsed to 4×6px (shrink-to-fit button)
  const tickBox = await boxes.first().boundingBox();
  expect(tickBox!.width).toBeGreaterThan(60);
  expect(tickBox!.height).toBeGreaterThan(80);
  for (let i = 0; i < 3; i++) {
    await boxes.nth(i).click();
  }
  await expect(page.getByRole("progressbar", { name: "COLLECTED" })).toHaveAttribute(
    "aria-valuenow",
    "3",
  );

  // ticks survive reload (localStorage)
  await page.reload();
  await page.getByRole("heading", { name: "PREVIEW" }).waitFor();
  await expect(page.getByRole("progressbar", { name: "COLLECTED" })).toHaveAttribute(
    "aria-valuenow",
    "3",
  );
});

test("all three PDFs download with the page counts the engine predicts", async ({ page }) => {
  test.setTimeout(180_000); // three full Puppeteer renders

  const cases = [
    { type: "binder", expectedPages: 12 }, // 102 cards / 9 per page
    { type: "checklist", expectedPages: 4 }, // 102 rows / 28 per sheet
    { type: "placeholders", expectedPages: 17 }, // 102 cards / 6 per sheet
  ] as const;

  for (const { type, expectedPages } of cases) {
    const res = await page.request.post("/api/pdf", {
      data: { type, config: { set: "base1" } },
    });
    expect(res.status(), `${type} status`).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
    expect(res.headers()["content-disposition"]).toContain(`bindermon-base1-${type}.pdf`);
    const body = await res.body();
    expect(body.byteLength, `${type} size`).toBeGreaterThan(10_000);
    const doc = await PDFDocument.load(body);
    expect(doc.getPageCount(), `${type} page count`).toBe(expectedPages);
  }
});

test("invalid PDF requests are rejected", async ({ page }) => {
  const badType = await page.request.post("/api/pdf", {
    data: { type: "novel", config: { set: "base1" } },
  });
  expect(badType.status()).toBe(400);

  const noSet = await page.request.post("/api/pdf", { data: { type: "binder", config: {} } });
  expect(noSet.status()).toBe(400);
});

test("unknown set shows a friendly error with retry", async ({ page }) => {
  await page.goto("/");
  // Black Star Promos has no fixture card data → the cards fetch 404s.
  await page.getByRole("combobox", { name: /search sets/i }).fill("scarlet & violet black star");
  await page.locator("[cmdk-item]", { hasText: "215/196" }).click();
  // Scoped to the GB dialog: Next's route announcer is also role=alert.
  await expect(page.locator('[data-gb-dialog][role="alert"]')).toContainText(/no fixture|library/i);
  await expect(page.getByRole("button", { name: "RETRY" })).toBeVisible();
});
