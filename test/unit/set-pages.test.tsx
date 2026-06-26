import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { readFile } from "node:fs/promises";
import path from "node:path";
import SetsIndexPage from "@/app/sets/page";
import SetPage, { generateMetadata } from "@/app/set/[setId]/page";
import { DEFAULT_CONFIG } from "@/lib/config";

// The /sets language-overlay select is a client component that calls useRouter,
// which has no app-router context under jsdom — stub it so the page renders.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/test",
}));

// server-store imports node:sqlite — a Node builtin Vite can't bundle for the
// jsdom environment. These tests run in fixture mode (below) and never touch the
// DB, so stub the store: data comes from the fixtures, master counts recompute.
vi.mock("@/lib/server-store", () => ({
  serverStore: {
    getOrCompute: (_key: string, _ttl: number, compute: () => unknown) => compute(),
    peek: () => undefined,
    set: () => {},
  },
  SqliteStore: class {},
  SETS_TTL_MS: 0,
  CARDS_TTL_MS: 0,
}));
import { recommendPreset } from "@/lib/binders";
import { encodeShareToken } from "@/lib/share";
import type { TcgSet } from "@/lib/tcg/types";

// Async server components: await the component call, then render the JSX.
// Fixture mode keeps every test deterministic and offline.
beforeEach(() => {
  vi.stubEnv("TCG_DATA_SOURCE", "fixture");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function readFixtureSets(): Promise<TcgSet[]> {
  return JSON.parse(
    await readFile(path.join(process.cwd(), "test", "fixtures", "sets.json"), "utf8"),
  ) as TcgSet[];
}

function linksWithHrefPrefix(prefix: string): HTMLElement[] {
  return screen.getAllByRole("link").filter((a) => (a.getAttribute("href") ?? "").startsWith(prefix));
}

describe("SetsIndexPage (/sets)", () => {
  it("lists a /set/ link for every fixture set, including base1", async () => {
    const fixtureSets = await readFixtureSets();
    const { container } = render(await SetsIndexPage({ searchParams: Promise.resolve({}) }));

    // Crawlability invariant: every set keeps a real <a href="/set/[id]"> in the
    // DOM even when its series is collapsed (only the latest two series are open
    // by default). Collapsed series sit in `hidden` containers, so they're absent
    // from the a11y tree — query the raw DOM, not getAllByRole, which skips them.
    const setLinks = [...container.querySelectorAll<HTMLAnchorElement>('a[href^="/set/"]')];
    expect(setLinks.length).toBeGreaterThan(50);
    expect(setLinks).toHaveLength(fixtureSets.length);

    const hrefs = setLinks.map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/set/base1");
  });

  it("orders series newest-first with the newest set leading", async () => {
    const fixtureSets = await readFixtureSets();
    const newest = [...fixtureSets].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))[0]!;
    render(await SetsIndexPage({ searchParams: Promise.resolve({}) }));

    const firstHref = linksWithHrefPrefix("/set/")[0]?.getAttribute("href");
    expect(firstHref).toBe(`/set/${newest.id}`);
  });

  it("has no axe violations", async () => {
    const { container } = render(await SetsIndexPage({ searchParams: Promise.resolve({}) }));
    expect(await axe(container)).toHaveNoViolations();
  }, 30_000);
});

describe("SetPage (/set/[setId])", () => {
  const renderBase1 = async () =>
    render(await SetPage({ params: Promise.resolve({ setId: "base1" }) }));

  it("renders a /card/ link for all 102 base1 cards", async () => {
    await renderBase1();
    const cardLinks = linksWithHrefPrefix("/card/");
    expect(cardLinks).toHaveLength(102);
    expect(cardLinks.map((a) => a.getAttribute("href"))).toContain("/card/base1-1");
    // Heading + subline identify the set.
    expect(screen.getByRole("heading", { level: 1, name: "BASE SET" })).toBeInTheDocument();
    expect(screen.getByText(/Base · 1999 · 102 printed \/ 102 total cards/)).toBeInTheDocument();
  });

  it("links both builder buttons to share-token URLs using the recommended grid", async () => {
    await renderBase1();
    const standard = screen.getByRole("link", { name: /open in binder builder/i });
    const master = screen.getByRole("link", { name: /master set layout/i });
    // base1's 102-card master set best fills a 40-page zip binder at 4 PKT (2×2).
    const rec = recommendPreset(102);
    expect(rec.label).toBe("4 PKT");
    expect(standard).toHaveAttribute(
      "href",
      `/b/${encodeShareToken({ ...DEFAULT_CONFIG, set: "base1", rows: rec.rows, cols: rec.cols })}`,
    );
    expect(master).toHaveAttribute(
      "href",
      `/b/${encodeShareToken({ ...DEFAULT_CONFIG, set: "base1", mode: "master", rows: rec.rows, cols: rec.cols })}`,
    );
    expect(screen.getByText(/recommended/i)).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /Binder fit/i })).toBeInTheDocument();
  });

  it("404s malformed and unknown set ids", async () => {
    await expect(SetPage({ params: Promise.resolve({ setId: "../etc" }) })).rejects.toThrow();
    await expect(SetPage({ params: Promise.resolve({ setId: "nope" }) })).rejects.toThrow();
  });

  it("titles metadata with the set name and card count; 404s unknown ids", async () => {
    const known = await generateMetadata({ params: Promise.resolve({ setId: "base1" }) });
    // "Base" → "Base Set" (the searched form) for SEO; other names are unchanged.
    expect(known.title).toBe("Base Set card list & binder layout (102 cards)");
    // generateMetadata shares the page's cached loader, so unknown ids 404
    // here exactly like the page body does.
    await expect(generateMetadata({ params: Promise.resolve({ setId: "zzz" }) })).rejects.toThrow();
  });

  it("has no axe violations", async () => {
    const { container } = await renderBase1();
    expect(await axe(container)).toHaveNoViolations();
  }, 30_000);
});
