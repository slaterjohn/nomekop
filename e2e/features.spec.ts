import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { stubCardImages } from "./helpers";

test.beforeEach(async ({ page }) => {
  await stubCardImages(page);
  await page.route("https://raw.githubusercontent.com/**", (route) =>
    route.fulfill({ path: "public/card-stub.png" }),
  );
});

test("pokemon binder: search → token URL → filters and order update the address bar", async ({
  page,
}) => {
  await page.goto("/pokemon");
  await page.getByLabel("POKÉMON NAME").fill("Pikachu");
  await page.getByRole("button", { name: "BUILD BINDER" }).click();
  await expect(page).toHaveURL(/\/pokemon\/pikachu~34an$/);

  await expect(page.getByRole("heading", { name: /PIKACHU BINDER/ })).toBeVisible();
  await expect(page.getByText(/POCKETS →/)).toBeVisible();

  // secrets-only filter flips the token
  await page.getByRole("option", { name: /SECRETS ONLY/ }).click();
  await expect(page).toHaveURL(/\/pokemon\/pikachu~34sn$/);
  // oldest-first ordering
  await page.getByRole("option", { name: /OLDEST FIRST/ }).click();
  await expect(page).toHaveURL(/\/pokemon\/pikachu~34so$/);

  // shared token reproduces the exact view
  await page.goto("/pokemon/pikachu~22bn");
  await expect(page.getByRole("button", { name: "4 PKT" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("option", { name: /RAREST PER SET/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("pokedex: defaults, swap a pick, URL + storage remember it", async ({ page }) => {
  // 5×5 grid puts #25 on the first page (the default 3×4 would page it off).
  await page.goto("/pokedex/g1~55");
  await expect(page.getByText(/151 POKÉMON →/)).toBeVisible();

  // Pikachu (#25) has multiple prints in the fixtures — swap it.
  const slot = page.getByRole("button", { name: /^#25 .*click to swap/ });
  await slot.click();
  const dialog = page.getByRole("dialog", { name: /#25 — pick a card/ });
  await expect(dialog).toBeVisible();
  const options = dialog.locator("ul button");
  expect(await options.count()).toBeGreaterThan(1);
  // pick the LAST alternative (not the default rarest)
  await options.last().click();
  await expect(page).toHaveURL(/\/pokedex\/g1~55~25\./);
  await expect(page.getByText(/1 CUSTOM PICKS/)).toBeVisible();
  await expect(page.getByText("PICK", { exact: true })).toBeVisible();

  // the pick token survives a direct visit
  const url = page.url();
  await page.goto(url);
  await expect(page.getByText(/1 CUSTOM PICKS/)).toBeVisible();

  // visiting the bare token offers to restore the saved picks
  await page.goto("/pokedex/g1~55");
  await expect(page.getByText(/SAVED PICKS FOR THIS POKÉDEX/)).toBeVisible();
  await page.getByRole("button", { name: "RESTORE" }).click();
  await expect(page).toHaveURL(/~25\./);
});

test("pokedex placeholder PDF renders with pixel icons", async ({ page }) => {
  test.setTimeout(120_000);
  const res = await page.request.post("/api/pdf", {
    data: { type: "pokedex-placeholders", token: "g1~34" },
    timeout: 120_000,
  });
  expect(res.status()).toBe(200);
  const doc = await PDFDocument.load(await res.body());
  expect(doc.getPageCount()).toBe(Math.ceil(151 / 4)); // 38 placeholder sheets

  const bad = await page.request.post("/api/pdf", {
    data: { type: "pokedex", token: "not-a-token" },
  });
  expect(bad.status()).toBe(400);
});

test("pokemon binder PDF honours the token", async ({ page }) => {
  test.setTimeout(120_000);
  const res = await page.request.post("/api/pdf", {
    data: { type: "pokemon", token: "charizard~22an" },
    timeout: 120_000,
  });
  expect(res.status()).toBe(200);
  const doc = await PDFDocument.load(await res.body());
  expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
});
