import { test, expect } from "@playwright/test";
import { stubCardImages } from "./helpers";

// The entire core flow, no pointer allowed.
test("keyboard-only: skip link → choose set → configure → tick a card", async ({ page }) => {
  await stubCardImages(page);
  await page.goto("/build");

  // First Tab lands on the skip link
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();
  await page.keyboard.press("Enter");

  // Reach the set search (combobox), type, pick via arrows
  await page.getByRole("combobox", { name: /search sets/i }).focus();
  await page.keyboard.type("scarlet & violet");
  // first option is highlighted by cmdk; step to the exact base set
  const option = page.getByRole("option", { name: /Scarlet & Violet.*258 cards/ });
  await expect(option).toBeVisible();
  while (!(await option.getAttribute("aria-selected").then((v) => v === "true"))) {
    await page.keyboard.press("ArrowDown");
  }
  await page.keyboard.press("Enter");
  await page.getByRole("heading", { name: "PREVIEW" }).waitFor();

  // CUSTOM reveals the steppers (keyboard activation)
  await page.getByRole("button", { name: "CUSTOM" }).focus();
  await page.keyboard.press("Enter");
  // Spinbutton: ArrowUp bumps rows
  await page.getByRole("spinbutton", { name: "ROWS" }).focus();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("spinbutton", { name: "ROWS" })).toHaveAttribute(
    "aria-valuenow",
    "4",
  );

  // Collection-mode listbox: roving focus with the ▶ cursor, Enter selects
  const standard = page.getByRole("option", { name: /STANDARD/ });
  await standard.focus();
  await expect(standard.locator('[data-gb-cursor="visible"]')).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/444 POCKETS/)).toBeVisible();

  // Toggle tick mode with Space, tick the first pocket with Space
  await page.getByRole("switch", { name: "COLLECTION MODE" }).focus();
  await page.keyboard.press("Space");
  const firstBox = page.getByRole("checkbox").first();
  await firstBox.focus();
  await page.keyboard.press("Space");
  await expect(firstBox).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("progressbar", { name: "COLLECTED" })).toHaveAttribute(
    "aria-valuenow",
    "1",
  );

  // Binder page navigation with arrow keys on the focused group
  await page.getByRole("group", { name: "Binder pages" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText(/PAGES 2–3 OF/)).toBeVisible();
});
