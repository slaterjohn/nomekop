import { describe, it, expect } from "vitest";
import { isSeriesVerified, VERIFIED_SERIES } from "@/lib/tcg/era-coverage";
import { reportHref } from "@/components/accuracy-disclaimer";

describe("era coverage", () => {
  it("verifies exactly the four researched eras", () => {
    expect([...VERIFIED_SERIES]).toEqual([
      "Mega Evolution",
      "Scarlet & Violet",
      "Sword & Shield",
      "Sun & Moon",
    ]);
  });

  it("marks the four most-recent eras as verified", () => {
    expect(isSeriesVerified("Mega Evolution")).toBe(true);
    expect(isSeriesVerified("Scarlet & Violet")).toBe(true);
    expect(isSeriesVerified("Sword & Shield")).toBe(true);
    expect(isSeriesVerified("Sun & Moon")).toBe(true);
  });

  it("marks older eras and the promo grab-bag as unverified", () => {
    for (const series of ["XY", "Black & White", "Base", "EX", "Other", "Neo"]) {
      expect(isSeriesVerified(series), series).toBe(false);
    }
  });

  it("does not verify an unknown/empty series", () => {
    expect(isSeriesVerified("")).toBe(false);
    expect(isSeriesVerified("Totally Made Up")).toBe(false);
  });
});

describe("reportHref", () => {
  it("pre-fills era and set when both are given", () => {
    expect(reportHref("Sword & Shield", "swsh1")).toBe(
      "/report?era=Sword+%26+Shield&set=swsh1",
    );
  });

  it("pre-fills just the era for an era-level link", () => {
    expect(reportHref("XY")).toBe("/report?era=XY");
  });

  it("is a bare link when nothing is supplied", () => {
    expect(reportHref()).toBe("/report");
  });
});
