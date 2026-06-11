import "server-only";
import puppeteer, { type Browser } from "puppeteer";
import pLimit from "p-limit";

// Per the design notes: at most 3 concurrent renders, one retry, 60s budget.
const limit = pLimit(3);
const RENDER_TIMEOUT_MS = 60_000;

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    try {
      const existing = await browserPromise;
      if (existing.connected) return existing;
    } catch {
      // fall through to relaunch
    }
  }
  browserPromise = puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: process.env.PUPPETEER_NO_SANDBOX === "1" ? ["--no-sandbox", "--disable-setuid-sandbox"] : [],
  });
  return browserPromise;
}

function baseUrl(): string {
  return process.env.PDF_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? 3000}`;
}

/**
 * Renders one of this app's own /print/* routes to an A4 PDF. Margins come
 * from the route's @page CSS, so browser-print and PDF output stay identical.
 */
export function renderPdf(pathWithQuery: string): Promise<Uint8Array> {
  return limit(async () => {
    try {
      return await attempt(pathWithQuery);
    } catch {
      // One retry: transient navigation/renderer hiccups are the common case.
      return attempt(pathWithQuery);
    }
  });
}

async function attempt(pathWithQuery: string): Promise<Uint8Array> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(`${baseUrl()}${pathWithQuery}`, {
      waitUntil: "networkidle0",
      timeout: RENDER_TIMEOUT_MS,
    });
    await page.evaluate(() => document.fonts.ready);
    return await page.pdf({
      format: "A4",
      printBackground: true,
      timeout: RENDER_TIMEOUT_MS,
    });
  } finally {
    await page.close().catch(() => {});
  }
}
