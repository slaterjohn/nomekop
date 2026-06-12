import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
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
    },
  },
});
