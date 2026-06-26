import { describe, it, expect } from "vitest";
import { foldKey, scoreLabel } from "@/lib/search/fuzzy";

describe("foldKey", () => {
  it("folds accents, case and punctuation", () => {
    expect(foldKey("Flabébé")).toBe("flabebe");
    expect(foldKey("Mr. Mime")).toBe("mrmime");
    expect(foldKey("Ho-Oh")).toBe("hooh");
    expect(foldKey("5ban Graphics")).toBe("5bangraphics");
  });
});

describe("scoreLabel", () => {
  it("ranks exact > prefix > substring > subsequence", () => {
    const exact = scoreLabel("pikachu", "Pikachu");
    const prefix = scoreLabel("pika", "Pikachu");
    const substr = scoreLabel("chu", "Pikachu");
    const subseq = scoreLabel("pkchu", "Pikachu");
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(substr);
    expect(substr).toBeGreaterThan(subseq);
    expect(subseq).toBeGreaterThan(0);
  });

  it("tolerates a typo for longer queries", () => {
    expect(scoreLabel("charizrd", "Charizard")).toBeGreaterThan(0);
    expect(scoreLabel("piakchu", "Pikachu")).toBeGreaterThan(0);
  });

  it("is accent- and punctuation-insensitive", () => {
    expect(scoreLabel("flabebe", "Flabébé")).toBe(scoreLabel("flabébé", "Flabébé"));
    expect(scoreLabel("mr mime", "Mr. Mime")).toBeGreaterThan(0);
  });

  it("returns 0 for no match and empty query", () => {
    expect(scoreLabel("zzzz", "Pikachu")).toBe(0);
    expect(scoreLabel("", "Pikachu")).toBe(0);
  });
});
