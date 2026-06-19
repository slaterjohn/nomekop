import { describe, expect, it } from "vitest";
import { num, money, pocketTable, cardLabel, possessive } from "@/lib/content/faqs/format";

describe("faq formatting helpers", () => {
  it("formats integers with thousands separators", () => {
    expect(num(20359)).toBe("20,359");
    expect(num(447)).toBe("447");
  });
  it("formats USD money", () => {
    expect(money(1579.6)).toBe("$1,579.60");
    expect(money(80)).toBe("$80.00");
  });
  it("builds a markdown pocket table for a slot count", () => {
    const md = pocketTable(131);
    expect(md).toContain("9-pocket");
    expect(md).toMatch(/\| *Pages *\|/);
  });
  it("labels a card as name + number", () => {
    expect(cardLabel({ id: "x", name: "Umbreon ex", number: "161" })).toBe("Umbreon ex (#161)");
  });
  it("forms a possessive that avoids \"…s's\" for names ending in s", () => {
    expect(possessive("Prismatic Evolutions")).toBe("Prismatic Evolutions'");
    expect(possessive("151")).toBe("151's");
  });
});
