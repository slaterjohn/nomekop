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

test("every binder offers a language picker with English locked on", async ({ page }) => {
  for (const url of ["/pokemon/pikachu~34an", "/illustrator/ken-sugimori~34n", "/pokedex/g1~55"]) {
    await page.goto(url);
    const picker = page.getByRole("group", { name: "Card languages" });
    await expect(picker).toBeVisible();
    const english = picker.getByRole("button", { name: /English/ });
    await expect(english).toHaveAttribute("aria-pressed", "true");
    // English can't be turned off — clicking it leaves it on.
    await english.click();
    await expect(english).toHaveAttribute("aria-pressed", "true");
    // Japanese starts off.
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

test("pokedex: enabling Japanese updates the token in place and survives a reload", async ({
  page,
}) => {
  await page.goto("/pokedex/g1~55");
  await page
    .getByRole("group", { name: "Card languages" })
    .getByRole("button", { name: "Japanese" })
    .click();
  // In-place token update (no full navigation) — the dex grid doesn't re-fetch.
  await expect(page).toHaveURL(/\/pokedex\/g1~55ej$/);
  await expect(page.getByText(/Other languages load as you open a pocket/)).toBeVisible();

  // The language rides in the URL, so a direct visit reproduces it.
  await page.goto("/pokedex/g1~55ej");
  await expect(
    page.getByRole("group", { name: "Card languages" }).getByRole("button", { name: "Japanese" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("pokedex: a custom pick still rides alongside the language in the token", async ({ page }) => {
  await page.goto("/pokedex/g1~55ej");
  // #25 Pikachu has English fixture prints; swap to a non-default English print.
  await page.getByRole("button", { name: /^#25 .*click to swap/ }).click();
  const dialog = page.getByRole("dialog", { name: /#25 — pick a card/ });
  await expect(dialog).toBeVisible();
  const options = dialog.locator("ul button");
  await options.last().click();
  // Token keeps both the language segment and the pick.
  await expect(page).toHaveURL(/\/pokedex\/g1~55ej~25\./);
});

test("sets: the language tabs link to each localized set list", async ({ page }) => {
  await page.goto("/sets");
  const tabs = page.getByRole("navigation", { name: "Set language" });
  await expect(tabs).toBeVisible();
  await expect(tabs.getByRole("link", { name: "日本語" })).toHaveAttribute("href", "/sets?lang=ja");
  await expect(tabs.getByRole("link", { name: "English" })).toHaveAttribute("href", "/sets");
});
