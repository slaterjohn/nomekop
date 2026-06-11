import { describe, it, expect } from "vitest";
import { parseCardNumber, compareCardNumbers, sortCards } from "@/lib/layout/number";

describe("parseCardNumber", () => {
  it("parses plain numerics", () => {
    expect(parseCardNumber("4")).toEqual({ prefix: "", num: 4, suffix: "" });
    expect(parseCardNumber("102")).toEqual({ prefix: "", num: 102, suffix: "" });
  });

  it("parses suffixed numbers", () => {
    expect(parseCardNumber("85a")).toEqual({ prefix: "", num: 85, suffix: "a" });
  });

  it("parses prefixed subset numbers", () => {
    expect(parseCardNumber("TG01")).toEqual({ prefix: "TG", num: 1, suffix: "" });
    expect(parseCardNumber("SV001")).toEqual({ prefix: "SV", num: 1, suffix: "" });
    expect(parseCardNumber("GG12")).toEqual({ prefix: "GG", num: 12, suffix: "" });
  });

  it("returns null for unparseable numbers", () => {
    expect(parseCardNumber("ONE")).toBeNull();
    expect(parseCardNumber("")).toBeNull();
  });
});

describe("compareCardNumbers / sortCards", () => {
  it("orders numerics, suffixes after base, prefixed groups last alphabetically", () => {
    const shuffled = ["100", "2", "85a", "GG02", "TG01", "1", "85", "10", "GG01", "TG02"];
    const sorted = [...shuffled].sort(compareCardNumbers);
    expect(sorted).toEqual(["1", "2", "10", "85", "85a", "100", "GG01", "GG02", "TG01", "TG02"]);
  });

  it("keeps unparseable numbers at the end, in stable input order", () => {
    const cards = [
      { id: "a", number: "WEIRD" },
      { id: "b", number: "2" },
      { id: "c", number: "ALSOWEIRD" },
      { id: "d", number: "1" },
    ];
    const sorted = sortCards(cards);
    expect(sorted.map((c) => c.id)).toEqual(["d", "b", "a", "c"]);
  });

  it("does not mutate its input", () => {
    const cards = [
      { id: "a", number: "2" },
      { id: "b", number: "1" },
    ];
    const copy = [...cards];
    sortCards(cards);
    expect(cards).toEqual(copy);
  });
});
