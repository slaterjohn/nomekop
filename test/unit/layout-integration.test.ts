// Integration of the full layout pipeline against the real captured fixtures.
import { describe, it, expect, beforeAll } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildBinderLayout } from "@/lib/layout";
import { DEFAULT_CONFIG } from "@/lib/config";
import { parseCardNumber } from "@/lib/layout/number";
import type { TcgCard } from "@/lib/tcg/types";

let base1: TcgCard[];
let sv1: TcgCard[];

beforeAll(async () => {
  const dir = path.join(process.cwd(), "test", "fixtures");
  base1 = JSON.parse(await readFile(path.join(dir, "cards-base1.json"), "utf8"));
  sv1 = JSON.parse(await readFile(path.join(dir, "cards-sv1.json"), "utf8"));
});

const BASE1 = { printedTotal: 102 };
const SV1 = { printedTotal: 198 };

describe("base1 (vintage, 102 cards, no reverses)", () => {
  it("standard 3×3 → 102 slots over 12 pages", () => {
    const layout = buildBinderLayout(base1, BASE1, { ...DEFAULT_CONFIG, rows: 3, cols: 3, mode: "standard", secrets: true });
    expect(layout.stats).toMatchObject({
      cards: 102,
      slots: 102,
      pages: 12,
      slotsPerPage: 9,
      rows: 3,
      cols: 3,
    });
    expect(layout.pages[11]!.slots.filter((s) => s.kind === "empty")).toHaveLength(6);
  });

  it("master mode equals standard (no reverse holos existed in 1999)", () => {
    const standard = buildBinderLayout(base1, BASE1, { ...DEFAULT_CONFIG, rows: 3, cols: 3, mode: "standard", secrets: true });
    const master = buildBinderLayout(base1, BASE1, { ...DEFAULT_CONFIG, rows: 3, cols: 3, mode: "master", secrets: true });
    expect(master.stats).toEqual(standard.stats);
  });
});

describe("sv1 (modern, 258 cards incl. secrets, reverses)", () => {
  it("standard with secrets → 258 slots over 29 pages of 3×3", () => {
    const layout = buildBinderLayout(sv1, SV1, { ...DEFAULT_CONFIG, rows: 3, cols: 3, mode: "standard", secrets: true });
    expect(layout.stats).toMatchObject({
      cards: 258,
      slots: 258,
      pages: 29,
      slotsPerPage: 9,
      rows: 3,
      cols: 3,
    });
  });

  it("master adds one slot per reverse-capable card, adjacent to its base", () => {
    const reverseCount = sv1.filter((c) => c.variants.reverse).length;
    expect(reverseCount).toBeGreaterThan(100); // sanity: fixture has real variance
    const layout = buildBinderLayout(sv1, SV1, { ...DEFAULT_CONFIG, rows: 3, cols: 3, mode: "master", secrets: true });
    expect(layout.stats.slots).toBe(258 + reverseCount);

    const flat = layout.pages.flatMap((p) => p.slots);
    flat.forEach((slot, i) => {
      if (slot.kind === "reverse") {
        const prev = flat[i - 1];
        expect(prev?.kind).toBe("card");
        expect(prev?.kind === "card" && prev.card.id).toBe(slot.card.id);
      }
    });
  });

  it("secrets off keeps only plain numbers ≤ 198", () => {
    const layout = buildBinderLayout(sv1, SV1, { ...DEFAULT_CONFIG, rows: 3, cols: 3, mode: "standard", secrets: false });
    expect(layout.stats.cards).toBe(198);
    const numbers = layout.pages
      .flatMap((p) => p.slots)
      .filter((s) => s.kind === "card")
      .map((s) => (s.kind === "card" ? parseCardNumber(s.card.number)!.num : 0));
    expect(Math.max(...numbers)).toBeLessThanOrEqual(198);
  });

  it("slots arrive in collector-number order", () => {
    const layout = buildBinderLayout(sv1, SV1, { ...DEFAULT_CONFIG, rows: 4, cols: 3, mode: "standard", secrets: true });
    const nums = layout.pages
      .flatMap((p) => p.slots)
      .filter((s) => s.kind === "card")
      .map((s) => (s.kind === "card" ? parseCardNumber(s.card.number)!.num : -1));
    const sorted = [...nums].sort((a, b) => a - b);
    expect(nums).toEqual(sorted);
  });

  it("spread count follows page count", () => {
    const layout = buildBinderLayout(sv1, SV1, { ...DEFAULT_CONFIG, rows: 3, cols: 3, mode: "standard", secrets: true });
    // 29 pages → 1 + ceil(28/2) = 15 spreads
    expect(layout.spreads).toHaveLength(15);
  });
});
