// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { masterCountFor, getMasterSetCounts } from "@/lib/tcg/master-count";
import type { TcgCard, TcgSet } from "@/lib/tcg/types";

function fixture(setId: string): TcgCard[] {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), "test", "fixtures", `cards-${setId}.json`), "utf8"),
  ) as TcgCard[];
}

describe("masterCountFor", () => {
  // Hermetic: feeds the committed fixture cards straight to the pure compute,
  // bypassing the cache-only peek. 447 matches the FAQ snapshot's Prismatic
  // Evolutions master figure (test/unit/faqs-compute.test.ts).
  it("computes Prismatic Evolutions (sv8pt5) master set as 447 slots", () => {
    const cards = fixture("sv8pt5");
    expect(masterCountFor({ printedTotal: 131, total: 180 }, cards)).toBe(447);
  });

  it("falls back to max(printedTotal, total) when no cards are cached", () => {
    expect(masterCountFor({ printedTotal: 131, total: 180 }, [])).toBe(180);
    expect(masterCountFor({ printedTotal: 102, total: 102 }, [])).toBe(102);
  });
});

describe("getMasterSetCounts curated override", () => {
  const set = (id: string, printedTotal: number, total: number): TcgSet => ({
    id,
    name: id,
    series: "test",
    printedTotal,
    total,
    releaseDate: "2026/01/01",
    symbolUrl: "",
    logoUrl: "",
  });

  // The curated authoritative count (data/master-counts.json) must win over the
  // heuristic AND the cold-cache fallback — so the /sets number is right whether
  // or not the cache is warm. Hermetic: no cache here, so the heuristic path
  // yields the plain total; the curated override replaces it.
  it("applies curated master-set counts over the heuristic/fallback", async () => {
    const counts = await getMasterSetCounts([
      set("me2pt5", 217, 295), // heuristic can't model the Energy pattern → curated 613
      set("sv8pt5", 131, 180), // curated 447
      set("zz-uncurated", 10, 20), // no curated entry → falls back to total (20)
    ]);
    expect(counts.get("me2pt5")).toBe(613);
    expect(counts.get("sv8pt5")).toBe(447);
    expect(counts.get("zz-uncurated")).toBe(20);
  });
});
