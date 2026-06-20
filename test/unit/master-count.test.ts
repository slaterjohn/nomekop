// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { masterCountFor } from "@/lib/tcg/master-count";
import type { TcgCard } from "@/lib/tcg/types";

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
