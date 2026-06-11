// Dev utility: captures UI screenshots of the running app (default :3170).
//   node scripts/screenshot.mjs [outDir]
import { chromium } from "@playwright/test";

const BASE = process.env.SHOT_BASE ?? "http://127.0.0.1:3170";
const OUT = process.argv[2] ?? "/tmp/bindermon-shots";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

// Stub the card CDN so shots don't depend on the network.
await page.route("https://images.pokemontcg.io/**", (route) =>
  route.fulfill({ path: "public/card-stub.png" }),
);

await page.goto(`${BASE}/`);
await page.waitForSelector("text=SEARCH SETS", { timeout: 15000 });
await page.screenshot({ path: `${OUT}/01-home.png`, fullPage: false });

await page.fill("[cmdk-input]", "scarlet & violet");
await page.screenshot({ path: `${OUT}/02-search.png` });

await page.locator("[cmdk-item]", { hasText: "198/258" }).click();
await page.waitForSelector("text=PAGE 1 OF", { timeout: 15000 });
await page.screenshot({ path: `${OUT}/03-builder.png`, fullPage: true });

// master mode + flip a page
await page.click("text=MASTER");
await page.waitForTimeout(400);
await page.click('button[aria-label="Next pages"]');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/04-master-spread.png`, fullPage: true });

await browser.close();
console.log(`screenshots written to ${OUT}`);
