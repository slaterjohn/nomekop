import { describe, expect, it } from "vitest";
import snapshot from "@/lib/content/faqs/data.json";
import type { FaqSnapshot } from "@/lib/content/faqs/types";

const snap = snapshot as unknown as FaqSnapshot;
const PRICELESS = new Set(["me4", "me3", "me2pt5"]);
// me2pt5 (Ascended Heroes) qualifies via its Poké Ball + Energy patterns.
const BALL_SETS = new Set(["sv8pt5", "zsv10pt5", "rsv10pt5", "me2pt5"]);

describe("faq snapshot", () => {
  it("covers the 3 newest eras, newest first", () => {
    expect(snap.sets).toHaveLength(38);
    // Exactly the three newest series in scope.
    const series = new Set(snap.sets.map((s) => s.series));
    expect(series).toEqual(new Set(["Mega Evolution", "Scarlet & Violet", "Sword & Shield"]));
    for (let i = 1; i < snap.sets.length; i++) {
      const prev = snap.sets[i - 1]!;
      const curr = snap.sets[i]!;
      expect(prev.releaseDate >= curr.releaseDate).toBe(true);
    }
  });

  it("every set has sane counts and a rarest card", () => {
    for (const s of snap.sets) {
      expect(s.printedTotal).toBeGreaterThan(0);
      expect(s.total).toBeGreaterThanOrEqual(s.printedTotal);
      expect(s.secretCount).toBe(Math.max(0, s.total - s.printedTotal));
      expect(s.masterSetCount).toBeGreaterThanOrEqual(s.total);
      expect(s.rarestCard?.id).toBeTruthy();
      expect(s.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("only priced sets carry a most-valuable card", () => {
    for (const s of snap.sets) {
      if (PRICELESS.has(s.id)) expect(s.mostValuableCard).toBeUndefined();
      else expect(s.mostValuableCard?.id).toBeTruthy();
    }
  });

  it("flags ball-pattern sets correctly", () => {
    for (const s of snap.sets) expect(s.hasBallPatterns).toBe(BALL_SETS.has(s.id));
  });

  it("caps marquee Pokémon at 5 with unique slugs", () => {
    for (const s of snap.sets) {
      expect(s.marqueePokemon.length).toBeLessThanOrEqual(5);
      const slugs = s.marqueePokemon.map((p) => p.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });
});
