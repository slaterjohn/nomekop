import { test, expect } from "@playwright/test";

// Regression: a slug containing a character above U+00FF used to 500. The route
// redirected to an un-encoded path, and Node rejects a Location header holding
// any code point above U+00FF (ERR_INVALID_CHAR) — which throws after the
// response has started, so the user gets a server error instead of a page.
//
// These are the forms real users arrive with: names pasted from Bulbapedia or
// Wikipedia (curly apostrophe), macOS/iOS text (combining accents, smart
// quotes), the real ♀/♂ Pokémon slugs, and Japanese names.
const SPECIAL_CHARACTER_URLS: [label: string, url: string][] = [
  ["curly apostrophe", "/pokemon/farfetch’d"],
  ["em dash", "/pokemon/hs—unleashed"],
  ["female sign, capitalised", "/pokemon/Nidoran♀"],
  ["female sign, typo", "/pokemon/nidoran♀s"],
  ["combining acute (NFD)", "/pokemon/flabébé"],
  ["japanese name", "/pokemon/ピカチュウ"],
  ["illustrator, curly apostrophe", "/illustrator/Mitsuhiro Arita’s"],
  ["illustrator, em dash", "/illustrator/HS—Unleashed"],
  ["illustrator, quotes and comma", '/illustrator/"Big Mama" Tagawa, CR CG gangs'],
  ["illustrator, slash in name", "/illustrator/Nobusawa%2FMochipuyo"],
];

for (const [label, url] of SPECIAL_CHARACTER_URLS) {
  test(`${label} does not error: ${url}`, async ({ page }) => {
    const res = await page.request.get(encodeURI(url), { maxRedirects: 10 });
    expect(res.status(), `${url} should not be a server error`).toBeLessThan(500);
  });
}

// A bare `%` is not a valid percent-encoding. Crawlers and scanners send these
// constantly; every dynamic route used to answer 500.
const MALFORMED_URLS = [
  "/set/%",
  "/collection/%",
  "/card/%",
  "/faqs/%",
  "/faqs/set/%",
  "/facts/%",
  "/pokemon/%",
  "/pokedex/%",
  "/illustrator/%",
  "/b/%",
  "/api/cards/%",
];

for (const url of MALFORMED_URLS) {
  test(`malformed URL 404s rather than 500s: ${url}`, async ({ page }) => {
    const res = await page.request.get(url, { maxRedirects: 10 });
    expect(res.status(), `${url} should not be a server error`).toBeLessThan(500);
  });
}

// The print routes read their token from a search param, which Next delivers
// already decoded — decoding it a second time threw URIError on a `%`.
for (const type of ["pokemon", "illustrator", "pokedex"]) {
  test(`print/${type} tolerates a percent in its token`, async ({ page }) => {
    const res = await page.request.get(`/print/${type}?t=%25`, { maxRedirects: 10 });
    expect(res.status()).toBeLessThan(500);
  });
}

test("a real ♀ slug still renders its info page", async ({ page }) => {
  await page.goto(encodeURI("/pokemon/nidoran♀"));
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/nidoran/i);
});

test("a capitalised ♀ slug redirects to a working binder", async ({ page }) => {
  const res = await page.request.get(encodeURI("/pokemon/Nidoran♀"), { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  // The redirect target must be percent-encoded, or Node cannot send the header.
  expect(res.headers()["location"]).toBe("/pokemon/nidoran%E2%99%80~34an");
});
