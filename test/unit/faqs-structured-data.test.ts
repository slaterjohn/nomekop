import { describe, expect, it } from "vitest";
import { faqPageJsonLd, faqsIndexJsonLd } from "@/lib/structured-data";

// Precise structural views of the JSON-LD output so the assertions can reach
// nested props without `any` (eslint forbids explicit any) and without tripping
// noUncheckedIndexedAccess on loose index signatures.
type FaqPageLd = {
  "@type": string;
  mainEntity: [
    {
      "@type": string;
      name: string;
      acceptedAnswer: { text: string };
    },
  ];
};

type FaqsIndexLd = {
  "@type": string;
  mainEntity: {
    "@type": string;
    numberOfItems: number;
    itemListElement: [{ url: string }];
  };
};

describe("faq structured data", () => {
  it("builds a single-question FAQPage mirroring the answer", () => {
    const ld = faqPageJsonLd("How many cards are in 151?", "151 has 165 cards.") as unknown as FaqPageLd;
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity[0]["@type"]).toBe("Question");
    expect(ld.mainEntity[0].name).toBe("How many cards are in 151?");
    expect(ld.mainEntity[0].acceptedAnswer.text).toBe("151 has 165 cards.");
  });

  it("builds a CollectionPage + ItemList for the index", () => {
    const ld = faqsIndexJsonLd([
      { slug: "rarest-card-in-151", question: "What is the rarest card in 151?", description: "x" },
    ]) as unknown as FaqsIndexLd;
    expect(ld["@type"]).toBe("CollectionPage");
    expect(ld.mainEntity["@type"]).toBe("ItemList");
    expect(ld.mainEntity.numberOfItems).toBe(1);
    expect(ld.mainEntity.itemListElement[0].url).toContain("/faqs/rarest-card-in-151");
  });
});
