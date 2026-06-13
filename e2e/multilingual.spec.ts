import { test, expect } from "@playwright/test";
import { stubCardImages } from "./helpers";

// The e2e server runs in fixture mode (no TCGdex), so these cover the
// multilingual UI wiring — picker presence, the language locked on, and the
// token/URL plumbing. Actual cross-language card mixing is verified against the
// live TCGdex source separately.

test.beforeEach(async ({ page }) => {
  await stubCardImages(page);
  await page.route("https://raw.githubusercontent.com/**", (route) =>
    route.fulfill({ path: "public/card-stub.png" }),
  );
  await page.route("https://assets.tcgdex.net/**", (route) =>
    route.fulfill({ path: "public/card-stub.png" }),
  );
});

test("pokemon & illustrator binders offer a multi-language picker, English locked on", async ({
  page,
}) => {
  for (const url of ["/pokemon/pikachu~34an", "/illustrator/ken-sugimori~34n"]) {
    await page.goto(url);
    const picker = page.getByRole("group", { name: "Card languages" });
    await expect(picker).toBeVisible();
    const english = picker.getByRole("button", { name: /English/ });
    await expect(english).toHaveAttribute("aria-pressed", "true");
    // English can't be turned off — clicking it leaves it on.
    await english.click();
    await expect(english).toHaveAttribute("aria-pressed", "true");
    await expect(picker.getByRole("button", { name: "Japanese" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  }
});

test("pokemon binder: enabling Japanese writes the language into the token", async ({ page }) => {
  await page.goto("/pokemon/pikachu~34an");
  await page.getByRole("group", { name: "Card languages" }).getByRole("button", { name: "Japanese" }).click();
  // Navigates (server re-fetches) to the en+ja token.
  await expect(page).toHaveURL(/\/pokemon\/pikachu~34anej$/);
  await expect(page.getByRole("button", { name: "Japanese" })).toHaveAttribute("aria-pressed", "true");
});

test("pokedex offers a single-language swap that navigates the whole binder", async ({ page }) => {
  await page.goto("/pokedex/g1~55");
  const select = page.getByRole("group", { name: "Binder language" });
  await expect(select).toBeVisible();
  await expect(select.getByRole("button", { name: "English" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // Swapping the language re-fetches the whole dex (one language at a time).
  await select.getByRole("button", { name: /Japanese/i }).click();
  await expect(page).toHaveURL(/\/pokedex\/g1~55j$/);
  await expect(
    page.getByRole("group", { name: "Binder language" }).getByRole("button", { name: /Japanese/i }),
  ).toHaveAttribute("aria-pressed", "true");

  // A direct visit to the localized token reproduces the selection.
  await page.goto("/pokedex/g1~55j");
  await expect(
    page.getByRole("group", { name: "Binder language" }).getByRole("button", { name: /Japanese/i }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("pokedex: an English custom pick rides in the token", async ({ page }) => {
  await page.goto("/pokedex/g1~55");
  await page.getByRole("button", { name: /^#25 .*click to swap/ }).click();
  const dialog = page.getByRole("dialog", { name: /#25 — pick a card/ });
  await expect(dialog).toBeVisible();
  await dialog.locator("ul button").last().click();
  await expect(page).toHaveURL(/\/pokedex\/g1~55~25\./);
});

test("settings: switching the app language re-renders the whole UI", async ({ page }) => {
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

test("sets: the language overlay select switches the list language", async ({ page }) => {
  await page.goto("/sets");
  const select = page.getByRole("combobox", { name: "Show sets in" });
  await expect(select).toBeVisible();
  await expect(select).toHaveValue("en");

  // Choosing Japanese overlays the English list and explains the badges.
  await select.selectOption("ja");
  await expect(page).toHaveURL(/\/sets\?lang=ja/);
  await expect(page.getByRole("heading", { level: 1, name: /ALL SETS/i })).toBeVisible();
  await expect(page.getByText(/badge marks an English set that also exists in Japanese/)).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Show sets in" })).toHaveValue("ja");
});
