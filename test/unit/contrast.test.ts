import { describe, it, expect } from "vitest";
import { THEMES } from "@/lib/themes";
import { contrastRatio } from "@/lib/contrast";

// WCAG 2.2 AA gate for every palette. Roles (see lib/themes.ts):
//   ink    = shades[0]  — all body text, focus indicators
//   muted  = shades[1]  — large text (≥18.66px bold / 24px), borders, decorative
//   accent = shades[2]  — fills that may carry ink text
//   bg     = shades[3]  — page/surface background
describe("theme contrast (WCAG AA)", () => {
  describe.each(THEMES)("$id", (theme) => {
    const [ink, muted, accent, bg] = theme.shades;

    it("ink on bg ≥ 4.5:1 (normal text)", () => {
      expect(contrastRatio(ink, bg)).toBeGreaterThanOrEqual(4.5);
    });

    it("ink on accent ≥ 4.5:1 (text on filled controls)", () => {
      expect(contrastRatio(ink, accent)).toBeGreaterThanOrEqual(4.5);
    });

    it("muted on bg ≥ 3:1 (large text / UI components)", () => {
      expect(contrastRatio(muted, bg)).toBeGreaterThanOrEqual(3);
    });

    it("focus indicator (ink) vs bg ≥ 3:1", () => {
      expect(contrastRatio(ink, bg)).toBeGreaterThanOrEqual(3);
    });
  });
});

describe("contrastRatio", () => {
  it("black on white is 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#0f380f", "#9bbc0f")).toBeCloseTo(contrastRatio("#9bbc0f", "#0f380f"), 5);
  });

  it("rejects malformed hex", () => {
    expect(() => contrastRatio("red", "#ffffff")).toThrow(/bad hex/);
  });
});
