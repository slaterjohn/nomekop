// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import robots from "@/app/robots";
import sitemap, { generateSitemaps } from "@/app/sitemap";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";
import { FAQ_PAGES } from "@/lib/content/faqs/registry";

// The /faqs index plus each FAQ page's detail + Markdown companion all land in
// the core shard (see app/sitemap.ts).
const FAQ_SITEMAP_ENTRIES = 1 + FAQ_PAGES.length * 2;

// Fixture snapshots: 173 sets; card data for base1 (102 cards), sv1 and sv8pt5.
const FIXTURE_SET_COUNT = 173;
const BASE = "http://localhost:3000";

beforeEach(() => {
  vi.stubEnv("TCG_DATA_SOURCE", "fixture");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("siteUrl", () => {
  it("falls back to localhost when NEXT_PUBLIC_SITE_URL is unset", () => {
    expect(siteUrl()).toBe(BASE);
  });

  it("strips a trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://bindermon.example/");
    expect(siteUrl()).toBe("https://bindermon.example");
  });

  it("returns the configured origin verbatim otherwise", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://bindermon.example");
    expect(siteUrl()).toBe("https://bindermon.example");
  });
});

describe("site identity", () => {
  it("has a name and a meta-description-sized description", () => {
    expect(SITE_NAME).toBe("Nomekop");
    expect(SITE_DESCRIPTION.length).toBeGreaterThan(100);
    expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(160);
  });
});

describe("robots", () => {
  it("disallows app-state and machine routes for all agents", async () => {
    const result = await robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    if (!rules) throw new Error("expected robots() to return a rule set");
    expect(rules.userAgent).toBe("*");
    expect(rules.allow).toBe("/");
    expect(rules.disallow).toEqual(
      expect.arrayContaining(["/api/", "/print/", "/collection/", "/b/"]),
    );
  });

  it("lists every sitemap shard, starting with the core sitemap", async () => {
    const result = await robots();
    const sitemaps = Array.isArray(result.sitemap)
      ? result.sitemap
      : result.sitemap
        ? [result.sitemap]
        : [];
    // generateSitemaps shards to /sitemap/<id>.xml (no /sitemap.xml index in
    // Next 16), so robots.txt enumerates each shard for discovery.
    expect(sitemaps[0]).toBe(`${BASE}/sitemap/core.xml`);
    expect(sitemaps).toContain(`${BASE}/sitemap/base1.xml`);
    expect(sitemaps).toHaveLength(FIXTURE_SET_COUNT + 1);
    for (const url of sitemaps) {
      expect(url).toMatch(/^http:\/\/localhost:3000\/sitemap\/[a-z0-9.]+\.xml$/i);
    }
  });
});

describe("generateSitemaps", () => {
  it("returns the core shard plus one shard per set", async () => {
    const shards = await generateSitemaps();
    expect(shards).toHaveLength(FIXTURE_SET_COUNT + 1);
    expect(shards[0]).toEqual({ id: "core" });
    expect(shards).toContainEqual({ id: "base1" });
    expect(shards).toContainEqual({ id: "sv8pt5" });
  });
});

describe("sitemap (core shard)", () => {
  it("lists home, /sets and every set page as absolute URLs", async () => {
    const entries = await sitemap({ id: "core" });
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain(`${BASE}/`);
    expect(urls).toContain(`${BASE}/sets`);
    expect(urls).toContain(`${BASE}/facts`);
    expect(urls.filter((url) => url.includes("/set/"))).toHaveLength(FIXTURE_SET_COUNT);
    // home, build, sets, pokedex, pokemon, illustrator, legal, /facts + 6 fact
    // articles + 6 article Markdown companions + 9 gen tokens = 29 static entries,
    // plus the /faqs index and every FAQ detail + Markdown companion.
    expect(entries).toHaveLength(FIXTURE_SET_COUNT + 29 + FAQ_SITEMAP_ENTRIES);
    for (const url of urls) {
      expect(url.startsWith(`${BASE}/`)).toBe(true);
    }
  });

  it("weights home over /sets over set pages", async () => {
    const entries = await sitemap({ id: "core" });
    const home = entries.find((entry) => entry.url === `${BASE}/`);
    const sets = entries.find((entry) => entry.url === `${BASE}/sets`);
    expect(home).toMatchObject({ changeFrequency: "weekly", priority: 1 });
    expect(sets).toMatchObject({ changeFrequency: "weekly", priority: 0.9 });
  });

  it("dates set pages from their release date", async () => {
    const entries = await sitemap({ id: "core" });
    const base1 = entries.find((entry) => entry.url === `${BASE}/set/base1`);
    expect(base1).toMatchObject({ changeFrequency: "monthly", priority: 0.7 });
    expect(base1?.lastModified).toEqual(new Date("1999-01-09"));
  });

  it("also accepts the promised id Next 16 passes at runtime", async () => {
    const entries = await sitemap({ id: Promise.resolve("core") });
    expect(entries.length).toBeGreaterThan(FIXTURE_SET_COUNT);
  });
});

describe("sitemap (set shards)", () => {
  it("lists every card page of the set", async () => {
    const entries = await sitemap({ id: "base1" });
    expect(entries).toHaveLength(102);
    for (const entry of entries) {
      expect(entry.url).toMatch(/^http:\/\/localhost:3000\/card\/base1-/);
      expect(entry.changeFrequency).toBe("weekly");
      expect(entry.priority).toBe(0.5);
    }
  });

  it("returns an empty shard for sets without card data", async () => {
    const entries = await sitemap({ id: "unknownsetzz" });
    expect(entries).toEqual([]);
  });
});
