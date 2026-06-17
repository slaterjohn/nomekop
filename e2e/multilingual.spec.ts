import { test, expect } from "@playwright/test";
import { stubCardImages } from "./helpers";

// The multi-language CARD feature (binder language pickers, the Pokédex language
// swap, the /sets language overlay, the /lset route) is gated behind
// NEXT_PUBLIC_CARD_LANGUAGES and OFF by default — so these specs assert it stays
// hidden. App INTERFACE localisation (translating the UI itself) is a separate
// concern and is covered as still-on at the bottom. To exercise the card
// feature, build with NEXT_PUBLIC_CARD_LANGUAGES=1.

test.beforeEach(async ({ page }) => {
  await stubCardImages(page);
  await page.route("https://raw.githubusercontent.com/**", (route) =>
    route.fulfill({ path: "public/card-stub.png" }),
  );
  await page.route("https://assets.tcgdex.net/**", (route) =>
    route.fulfill({ path: "public/card-stub.png" }),
  );
});

test("pokemon & illustrator binders hide the card-language picker by default", async ({ page }) => {
  for (const url of ["/pokemon/pikachu~34an", "/illustrator/ken-sugimori~34n"]) {
    await page.goto(url);
    // The binder still renders…
    await expect(page.getByRole("group", { name: "Binder size" })).toBeVisible();
    // …but the card-language picker is gone.
    await expect(page.getByRole("group", { name: "Card languages" })).toHaveCount(0);
  }
});

test("a token carrying a non-English language still renders an English-only binder", async ({
  page,
}) => {
  // `~34anej` = en+ja. With the feature off it must fall back to English and
  // show no picker, rather than 404 or render a broken multi-language binder.
  await page.goto("/pokemon/pikachu~34anej");
  await expect(page.getByRole("group", { name: "Binder size" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Card languages" })).toHaveCount(0);
});

test("pokedex hides the binder-language swap by default", async ({ page }) => {
  await page.goto("/pokedex/g1~55");
  await expect(page.getByRole("group", { name: "Binder size" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Binder language" })).toHaveCount(0);
});

test("pokedex: an English custom pick still rides in the token (swap is not gated)", async ({
  page,
}) => {
  await page.goto("/pokedex/g1~55");
  await page.getByRole("button", { name: /^#25 .*click to swap/ }).click();
  const dialog = page.getByRole("dialog", { name: /#25 — pick a card/ });
  await expect(dialog).toBeVisible();
  await dialog.locator("ul button").last().click();
  await expect(page).toHaveURL(/\/pokedex\/g1~55~25\./);
});

test("the localized-set route 404s when the feature is off", async ({ page }) => {
  const response = await page.goto("/lset/ja/sv1");
  expect(response?.status()).toBe(404);
});

test("sets: the language overlay select is hidden and ?lang is ignored", async ({ page }) => {
  await page.goto("/sets");
  await expect(page.getByRole("heading", { level: 1, name: /ALL SETS/i })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Show sets in" })).toHaveCount(0);

  // A direct ?lang=ja must not overlay anything — the plain English list shows,
  // with no badge-explainer note.
  await page.goto("/sets?lang=ja");
  await expect(page.getByRole("combobox", { name: "Show sets in" })).toHaveCount(0);
  await expect(page.getByText(/badge marks an English set that also exists/)).toHaveCount(0);
});

test("settings: switching the app language re-renders the whole UI (localisation stays on)", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.getByRole("dialog");
  const langSelect = dialog.getByRole("combobox", { name: "Language" });
  await expect(langSelect).toBeVisible();
  await expect(langSelect).toHaveValue("en");

  // Switch to German — the server tree re-renders via the locale cookie.
  await langSelect.selectOption("de");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  // The dialog itself re-renders in German (its title is now "Einstellungen").
  await expect(dialog.getByRole("heading", { name: "Einstellungen" })).toBeVisible();

  // Close the modal so the header nav is no longer inert, then confirm it's
  // German — the English "Binders" tab is gone (translation-agnostic check).
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).not.toContainText("Binders");

  // The choice persists across navigation (it's in a cookie).
  await page.goto("/pokedex");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
});
