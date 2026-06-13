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

test("sets: the language tabs link to each localized set list", async ({ page }) => {
  await page.goto("/sets");
  const tabs = page.getByRole("navigation", { name: "Set language" });
  await expect(tabs).toBeVisible();
  await expect(tabs.getByRole("link", { name: "日本語" })).toHaveAttribute("href", "/sets?lang=ja");
  await expect(tabs.getByRole("link", { name: "English" })).toHaveAttribute("href", "/sets");
});
