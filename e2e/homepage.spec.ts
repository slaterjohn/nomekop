import { test, expect } from "@playwright/test";

test("homepage hub: tiles navigate to each binder type", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /BUILD THE PERFECT BINDER/i })).toBeVisible();

  // Each tile is a real link with a CTA. (Set browsing now lives at /sets.)
  await expect(page.getByRole("link", { name: /Set binders/i })).toHaveAttribute("href", "/sets");
  await expect(page.getByRole("link", { name: /Pokémon binders/i })).toHaveAttribute("href", "/pokemon");
  await expect(page.getByRole("link", { name: /Pokédex binders/i })).toHaveAttribute("href", "/pokedex");
  await expect(page.getByRole("link", { name: /Illustrator binders/i })).toHaveAttribute("href", "/illustrator");

  await page.getByRole("link", { name: /Set binders/i }).click();
  await expect(page).toHaveURL(/\/sets$/);
  await expect(page.getByRole("searchbox", { name: /search sets/i })).toBeVisible();
});

test("primary nav highlights the active section", async ({ page }) => {
  await page.goto("/build");
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav.getByRole("link", { name: "Sets" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Pokémon" })).not.toHaveAttribute("aria-current", "page");
});

test("footer legal link reaches the credits page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: /LEGAL & CREDITS/i }).first().click();
  await expect(page).toHaveURL(/\/legal$/);
  await expect(page.getByRole("heading", { level: 1, name: /LEGAL & CREDITS/i })).toBeVisible();
  await expect(page.getByText(/not affiliated with, endorsed by, or sponsored by/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /pokemontcg\.io/i }).first()).toBeVisible();
});

test("settings panel: change palette and reduce animation from the header", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Settings")).toBeVisible();

  // Pick the Cerulean palette → <html data-theme> updates.
  await dialog.getByRole("radio", { name: /CERULEAN palette/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "cerulean");

  // Reduce animation → <html data-reduce-motion> is set.
  await dialog.getByRole("switch", { name: "Reduce animation" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "1");

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();

  // The preference survives a reload (persisted to localStorage).
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-reduce-motion", "1");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "cerulean");
});

test("secret arcade unlocks via the Konami code", async ({ page }) => {
  await page.goto("/");
  // ↑ ↑ ↓ ↓ ← → ← → b a
  const code = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "b",
    "a",
  ];
  for (const key of code) await page.keyboard.press(key);

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/ORB FLIP/i)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});
