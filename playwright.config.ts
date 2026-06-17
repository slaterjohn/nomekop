import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Several specs each drive Puppeteer (p-limit 3 server-side); too many
  // parallel workers swamp it and PDF renders queue past their timeouts.
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3170",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "reduced-motion",
      use: { ...devices["Desktop Chrome"], contextOptions: { reducedMotion: "reduce" } },
      testMatch: /a11y\.spec\.ts/,
    },
  ],
  webServer: {
    command: "pnpm start -p 3170",
    url: "http://127.0.0.1:3170",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      TCG_DATA_SOURCE: "fixture",
      IMG_STUB: "1",
      PORT: "3170",
      DISABLE_PDF_RATE_LIMIT: "1",
      // The boot splash is a full-screen overlay; skip it so specs aren't blocked
      // waiting for it to fade on every page load.
      DISABLE_SPLASH: "1",
      // The PDF pipeline launches Chromium via Puppeteer; CI Linux runners have
      // no usable sandbox, so without --no-sandbox the browser fails to launch
      // and every PDF render 504s. lib/pdf.ts gates the flag on this env var.
      PUPPETEER_NO_SANDBOX: "1",
    },
  },
});
