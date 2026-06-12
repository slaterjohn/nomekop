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
  await expect(page).toHaveURL(/\/b\/sv1~34s111ic/);

  // default is the 12-pocket binder; CUSTOM reveals the steppers
  await expect(page.getByRole("button", { name: "12 PKT" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("spinbutton", { name: "ROWS" })).toHaveCount(0);
  await page.getByRole("button", { name: "CUSTOM" }).click();
  await page.getByRole("button", { name: "Increase ROWS" }).click();
  await expect(page.getByRole("spinbutton", { name: "ROWS" })).toHaveAttribute("aria-valuenow", "4");
  await page.getByRole("button", { name: "12 PKT" }).click(); // back to the default grid

  // master mode interleaves reverses: 258 + 186 = 444 pockets over 37 pages
  await page.getByRole("option", { name: /MASTER/ }).click();
  await expect(page.getByText("258 CARDS → 444 POCKETS → 37 PAGES")).toBeVisible();
  await expect(page).toHaveURL(/\/b\/sv1~34m111ic/);
  await expect(page.getByText("REV").first()).toBeVisible();

  // flip pages
  await page.getByRole("button", { name: "Next pages" }).click();
  await expect(page.getByText(/PAGES 2–3 OF 37/)).toBeVisible();

  // tick three cards
  await page.getByRole("switch", { name: "COLLECTION MODE" }).click();
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

  // ticks AND collection mode survive reload (localStorage)
  await page.reload();
  await page.getByRole("heading", { name: "PREVIEW" }).waitFor();
  await expect(page.getByRole("progressbar", { name: "COLLECTED" })).toHaveAttribute(
    "aria-valuenow",
    "3",
  );
  await expect(page.getByRole("switch", { name: "COLLECTION MODE" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.getByRole("checkbox").first()).toBeVisible();

  // CSV export carries the collected column
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("collection.csv");
});

test("all three PDFs download with the page counts the engine predicts", async ({ page }) => {
  test.setTimeout(180_000); // three full Puppeteer renders

  const cases = [
    { type: "binder", expectedPages: 9 }, // 102 cards / 12 per page (3×4 default)
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

test("cards have their own pages with prices; back returns to the builder", async ({ page }) => {
  await page.goto("/");
  await chooseScarletViolet(page);

  await page.getByRole("button", { name: /View details: Pineco/ }).click();
  await expect(page).toHaveURL(/\/card\/sv1-1$/);
  await expect(page.getByRole("table", { name: /TCGplayer prices/i })).toBeVisible();
  await expect(page.getByRole("row", { name: /NORMAL.*\$/ }).first()).toBeVisible();
  // the junk High column is gone
  await expect(page.getByRole("columnheader", { name: /High/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /TCGPLAYER/i })).toBeVisible();

  await page.getByRole("button", { name: /BACK/ }).click();
  await expect(page).toHaveURL(/\/b\/sv1~34s111ic/);
  await expect(page.getByRole("heading", { name: "PREVIEW" })).toBeVisible();
});

test("share links encode the layout into a tidy URL", async ({ page }) => {
  await page.goto("/b/sv8pt5~34m111ic");
  // token pages render the builder directly — the tidy URL stays put
  await expect(page).toHaveURL(/\/b\/sv8pt5~34m111ic/);
  await page.getByRole("heading", { name: "PREVIEW" }).waitFor();
  await expect(page.getByText(/447 POCKETS/)).toBeVisible();

  // and the SHARE button produces that link
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "SHARE" }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("/b/sv8pt5~34m111ic");

  // invalid tokens 404
  const res = await page.goto("/b/garbage-token");
  expect(res!.status()).toBe(404);
});

test("collection page lists collected pockets per mode", async ({ page }) => {
  await page.goto("/");
  await chooseScarletViolet(page);
  await page.getByRole("switch", { name: "COLLECTION MODE" }).click();
  const boxes = page.getByRole("checkbox");
  await boxes.nth(0).click();
  await boxes.nth(1).click();

  await page.getByRole("link", { name: "VIEW COLLECTION" }).click();
  await expect(page).toHaveURL(/\/collection\/sv1$/);
  await expect(page.getByRole("progressbar", { name: "COLLECTED" })).toHaveAttribute(
    "aria-valuenow",
    "2",
  );
  await expect(page.getByText(/NORMAL 2\/258/)).toBeVisible();
  // collected cards link to their pages
  await page.getByRole("link", { name: /Pineco 1/ }).click();
  await expect(page).toHaveURL(/\/card\/sv1-1/);
});

test("Prismatic Evolutions master set offers ball-pattern options", async ({ page }) => {
  await page.goto("/?set=sv8pt5");
  await page.getByRole("heading", { name: "PREVIEW" }).waitFor();

  // Standard mode: no ball options
  await expect(page.getByRole("switch", { name: "POKÉ BALL" })).toHaveCount(0);

  await page.getByRole("option", { name: /MASTER/ }).click();
  // 180 cards + 100 reverse + 100 poké + 67 master = 447 pockets, 38 pages of 12
  await expect(page.getByText("180 CARDS → 447 POCKETS → 38 PAGES")).toBeVisible();
  await expect(page.getByRole("switch", { name: "POKÉ BALL" })).toBeVisible();
  await expect(page.getByRole("switch", { name: "MASTER BALL" })).toBeVisible();
  await expect(page.getByText("POKÉ").first()).toBeVisible();

  // Turning master ball off shrinks the binder
  await page.getByRole("switch", { name: "MASTER BALL" }).click();
  await expect(page.getByText("180 CARDS → 380 POCKETS → 32 PAGES")).toBeVisible();
  await expect(page).toHaveURL(/\/b\/sv8pt5~34m110ic/);

  // Placement at end keeps the pocket count, groups ball runs after the set
  await page.getByRole("option", { name: /AT END/ }).click();
  await expect(page).toHaveURL(/\/b\/sv8pt5~34m110ec/);
  await expect(page.getByText("180 CARDS → 380 POCKETS → 32 PAGES")).toBeVisible();

  // The binder shelf recommends matching 12-pocket Vault X binders
  await expect(page.getByRole("heading", { name: "FIND THE RIGHT BINDER" })).toBeVisible();
  await expect(page.getByText("Vault X 12-Pocket Exo-Tec Zip Binder")).toBeVisible();
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
