import { test, expect } from "@playwright/test";

test("homepage hub: tiles navigate to each binder type", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /BUILD THE PERFECT BINDER/ })).toBeVisible();

  // Each tile is a real link with a CTA.
  await expect(page.getByRole("link", { name: /BUILD A SET/ })).toHaveAttribute("href", "/build");
  await expect(page.getByRole("link", { name: /PICK A POKÉMON/ })).toHaveAttribute("href", "/pokemon");
  await expect(page.getByRole("link", { name: /CHOOSE A REGION/ })).toHaveAttribute("href", "/pokedex");
  await expect(page.getByRole("link", { name: /FIND AN ARTIST/ })).toHaveAttribute("href", "/illustrator");

  await page.getByRole("link", { name: /BUILD A SET/ }).click();
  await expect(page).toHaveURL(/\/build$/);
  await expect(page.getByRole("heading", { name: "CHOOSE SET" })).toBeVisible();
});

test("primary nav highlights the active section", async ({ page }) => {
  await page.goto("/build");
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav.getByRole("link", { name: "SETS" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "POKÉMON" })).not.toHaveAttribute("aria-current", "page");
});

test("footer legal link reaches the credits page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: /LEGAL & CREDITS/ }).first().click();
  await expect(page).toHaveURL(/\/legal$/);
  await expect(page.getByRole("heading", { level: 1, name: /LEGAL & CREDITS/ })).toBeVisible();
  await expect(page.getByText(/not affiliated with, endorsed by, or sponsored by/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /pokemontcg\.io/i }).first()).toBeVisible();
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
