import { describe, expect, it } from "vitest";
import { FAQ_PAGES, getFaqPage, faqPagesForSet, faqSlugs } from "@/lib/content/faqs/registry";

const internalFaq = (href: string) => href.startsWith("how-") || href.startsWith("is-there-") ||
  href.startsWith("best-") || href.startsWith("rarest-") || href.startsWith("most-") ||
  href.startsWith("chase-") || href.startsWith("when-") || href.startsWith("does-");

describe("faq registry", () => {
  it("produces a sizeable, slug-unique page set", () => {
    expect(FAQ_PAGES.length).toBeGreaterThan(250);
    expect(new Set(faqSlugs).size).toBe(faqSlugs.length);
  });

  it("skips valuable-card pages for priceless sets", () => {
    const priceless = new Set(["me4", "me3", "me2pt5"]);
    const valuable = FAQ_PAGES.filter((p) => p.type === "valuable-card");
    expect(valuable.some((p) => priceless.has(p.setId))).toBe(false);
    expect(valuable.length).toBe(17);
  });

  it("only emits ball-pattern pages for ball-pattern sets", () => {
    const ball = FAQ_PAGES.filter((p) => p.type === "ball-patterns");
    expect(ball.map((p) => p.setId).sort()).toEqual(["rsv10pt5", "sv8pt5", "zsv10pt5"]);
  });

  it("has no dangling internal FAQ links", () => {
    const known = new Set(faqSlugs);
    for (const page of FAQ_PAGES) {
      for (const r of page.related) {
        if (internalFaq(r.href)) expect(known.has(r.href)).toBe(true);
      }
    }
  });

  it("every page answer (description) is non-empty and mirrored into the body", () => {
    for (const page of FAQ_PAGES) {
      expect(page.description.length).toBeGreaterThan(20);
      expect(page.body).toContain(page.description);
      expect(page.question).toMatch(/\?$/);
    }
  });

  it("getFaqPage + faqPagesForSet resolve", () => {
    const sample = FAQ_PAGES[0]!;
    expect(getFaqPage(sample.slug)).toBe(sample);
    expect(faqPagesForSet(sample.setId)).toContain(sample);
    expect(getFaqPage("does-not-exist")).toBeUndefined();
  });
});
