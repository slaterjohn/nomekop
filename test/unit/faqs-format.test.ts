import { describe, expect, it } from "vitest";
import {
  num, money, pocketTable, cardLabel, possessive, cardImageLink, cardGallery,
} from "@/lib/content/faqs/format";

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

  it("renders a linked card thumbnail, opening the card page", () => {
    const card = { id: "base1-4", name: "Charizard", number: "4", imageSmall: "https://img/x.png" };
    expect(cardImageLink(card)).toBe("[![Charizard (#4)](https://img/x.png)](/card/base1-4)");
  });

  it("omits a thumbnail when the card has no scan", () => {
    expect(cardImageLink({ id: "base1-4", name: "Charizard", number: "4" })).toBe("");
  });

  it("builds a gallery row of only the cards that have scans, capped", () => {
    const cards = [
      { id: "a-1", name: "A", number: "1", imageSmall: "https://img/a.png" },
      { id: "b-2", name: "B", number: "2" },
      { id: "c-3", name: "C", number: "3", imageSmall: "https://img/c.png" },
    ];
    const md = cardGallery(cards, 6);
    expect(md).toContain("](/card/a-1)");
    expect(md).toContain("](/card/c-3)");
    expect(md).not.toContain("/card/b-2");
    expect(cardGallery([{ id: "b-2", name: "B", number: "2" }])).toBe("");
  });
});
