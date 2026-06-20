import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { render } from "@testing-library/react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { JsonLd } from "@/components/json-ld";
import { FAQ_ENTRIES } from "@/lib/faq";
import { SITE_NAME } from "@/lib/site";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  cardProductJsonLd,
  factsCollectionJsonLd,
  faqJsonLd,
  setCollectionJsonLd,
  setsIndexJsonLd,
  webApplicationJsonLd,
  webSiteJsonLd,
} from "@/lib/structured-data";
import type { TcgCard, TcgSet } from "@/lib/tcg/types";

// Builders read siteUrl() at call time; unset the env so every test sees the
// deterministic localhost fallback.
const BASE = "http://localhost:3000";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

type Obj = Record<string, unknown>;
const obj = (value: unknown): Obj => value as Obj;
const arr = (value: unknown): Obj[] => value as Obj[];

async function readFixture<T>(name: string): Promise<T> {
  return JSON.parse(
    await readFile(path.join(process.cwd(), "test", "fixtures", name), "utf8"),
  ) as T;
}

async function fixtureSet(id: string): Promise<TcgSet> {
  const sets = await readFixture<TcgSet[]>("sets.json");
  const set = sets.find((s) => s.id === id);
  if (!set) throw new Error(`fixture set ${id} missing`);
  return set;
}

describe("webSiteJsonLd", () => {
  it("emits a WebSite with name, absolute url and description", () => {
    const data = webSiteJsonLd();
    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@type"]).toBe("WebSite");
    expect(data.name).toBe(SITE_NAME);
    expect(data.url).toBe(`${BASE}/`);
    expect(String(data.description).length).toBeGreaterThan(50);
  });

  it("derives the url from NEXT_PUBLIC_SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://bindermon.example");
    expect(webSiteJsonLd().url).toBe("https://bindermon.example/");
  });
});

describe("webApplicationJsonLd", () => {
  it("emits a WebApplication with category, OS and browser requirements", () => {
    const data = webApplicationJsonLd();
    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@type"]).toBe("WebApplication");
    expect(data.name).toBe(SITE_NAME);
    expect(data.url).toBe(`${BASE}/`);
    expect(data.applicationCategory).toBe("UtilityApplication");
    expect(data.operatingSystem).toBe("Web");
    expect(data.browserRequirements).toBe("Requires JavaScript");
  });

  it("declares the app free via a zero-price Offer", () => {
    expect(obj(webApplicationJsonLd().offers)).toEqual({
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    });
  });
});

describe("faqJsonLd", () => {
  it("emits an FAQPage with one Question per FAQ entry", () => {
    const data = faqJsonLd(FAQ_ENTRIES);
    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@type"]).toBe("FAQPage");
    expect(arr(data.mainEntity)).toHaveLength(FAQ_ENTRIES.length);
  });

  it("mirrors the visible question and answer text verbatim", () => {
    const questions = arr(faqJsonLd(FAQ_ENTRIES).mainEntity);
    questions.forEach((question, index) => {
      expect(question["@type"]).toBe("Question");
      expect(question.name).toBe(FAQ_ENTRIES[index]!.question);
      expect(obj(question.acceptedAnswer)).toEqual({
        "@type": "Answer",
        text: FAQ_ENTRIES[index]!.answer,
      });
    });
  });
});

describe("breadcrumbJsonLd", () => {
  const trail = [
    { name: "Home", path: "/" },
    { name: "Sets", path: "/sets" },
    { name: "Base", path: "/set/base1" },
  ];

  it("numbers ListItem positions 1..n", () => {
    const data = breadcrumbJsonLd(trail);
    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@type"]).toBe("BreadcrumbList");
    expect(arr(data.itemListElement).map((item) => item.position)).toEqual([1, 2, 3]);
  });

  it("resolves every item to an absolute URL", () => {
    const items = arr(breadcrumbJsonLd(trail).itemListElement);
    expect(items.map((item) => item.item)).toEqual([
      `${BASE}/`,
      `${BASE}/sets`,
      `${BASE}/set/base1`,
    ]);
    for (const item of items) {
      expect(item["@type"]).toBe("ListItem");
      expect(item.name).toBeTruthy();
    }
  });
});

describe("cardProductJsonLd", () => {
  async function charizard(): Promise<{ card: TcgCard; set: TcgSet }> {
    const cards = await readFixture<TcgCard[]>("cards-base1.json");
    const card = cards.find((c) => c.id === "base1-4");
    if (!card) throw new Error("fixture card base1-4 missing");
    return { card, set: await fixtureSet("base1") };
  }

  it("emits a Product with name, image, sku, brand and category", async () => {
    const { card, set } = await charizard();
    const data = cardProductJsonLd(card, set);
    if (!data) throw new Error("expected a Product for a priced card");

    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@type"]).toBe("Product");
    expect(data.name).toBe("Charizard (Base 4/102)");
    expect(data.image).toEqual([card.imageLarge]);
    expect(data.sku).toBe("base1-4");
    expect(obj(data.brand)).toEqual({ "@type": "Brand", name: "Pokémon TCG" });
    expect(data.category).toBe("Trading Card");
    // One sentence covering rarity, set and series.
    expect(data.description).toBe(
      "Charizard is a Rare Holo card from the Base set in the Pokemon TCG Base series.",
    );
  });

  it("aggregates TCGplayer variant prices into an AggregateOffer", async () => {
    const { card, set } = await charizard();
    const data = cardProductJsonLd(card, set);
    if (!data) throw new Error("expected a Product for a priced card");
    const offers = obj(data.offers);

    expect(offers["@type"]).toBe("AggregateOffer");
    expect(offers.priceCurrency).toBe("USD");
    expect(offers.availability).toBe("https://schema.org/InStock");
    expect(offers.url).toBe(card.tcgplayer?.url);
    expect(offers.offerCount).toBeGreaterThanOrEqual(1);
    // Prices are strings with exactly two decimals, low ≤ high.
    expect(offers.lowPrice).toMatch(/^\d+\.\d{2}$/);
    expect(offers.highPrice).toMatch(/^\d+\.\d{2}$/);
    expect(Number(offers.lowPrice)).toBeLessThanOrEqual(Number(offers.highPrice));
  });

  it("returns null when the card has no tcgplayer data (avoids an offerless Product)", async () => {
    const { card, set } = await charizard();
    const { tcgplayer: _stripped, ...priceless } = card;
    expect(cardProductJsonLd(priceless as TcgCard, set)).toBeNull();
  });

  it("returns null when no variant has a market or low value", async () => {
    const { card, set } = await charizard();
    const unpriced: TcgCard = {
      ...card,
      tcgplayer: { url: card.tcgplayer?.url, prices: { holofoil: { directLow: 1.23 } } },
    };
    expect(cardProductJsonLd(unpriced, set)).toBeNull();
  });
});

describe("setCollectionJsonLd", () => {
  async function sv1(): Promise<{ set: TcgSet; cards: TcgCard[] }> {
    return { set: await fixtureSet("sv1"), cards: await readFixture<TcgCard[]>("cards-sv1.json") };
  }

  it("emits a CollectionPage tied to the WebSite with absolute urls", async () => {
    const { set, cards } = await sv1();
    const data = setCollectionJsonLd(set, cards);

    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@type"]).toBe("CollectionPage");
    expect(data.name).toContain("Scarlet & Violet");
    expect(data.url).toBe(`${BASE}/set/sv1`);
    expect(data.description).toContain("Scarlet & Violet");
    expect(obj(data.isPartOf)).toEqual({ "@type": "WebSite", url: `${BASE}/` });
  });

  it("caps the ItemList at 50 entries while reporting the full count", async () => {
    const { set, cards } = await sv1();
    const list = obj(setCollectionJsonLd(set, cards).mainEntity);

    expect(cards).toHaveLength(258);
    expect(list["@type"]).toBe("ItemList");
    expect(list.numberOfItems).toBe(258);

    const items = arr(list.itemListElement);
    expect(items).toHaveLength(50);
    expect(items.map((item) => item.position)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    expect(items[0]).toEqual({
      "@type": "ListItem",
      position: 1,
      name: cards[0]!.name,
      url: `${BASE}/card/${cards[0]!.id}`,
    });
  });

  it("lists every card when the set is under the cap", async () => {
    const { set, cards } = await sv1();
    const list = obj(setCollectionJsonLd(set, cards.slice(0, 10)).mainEntity);
    expect(list.numberOfItems).toBe(10);
    expect(arr(list.itemListElement)).toHaveLength(10);
  });
});

describe("setsIndexJsonLd", () => {
  it("lists every set with absolute /set/ urls", async () => {
    const sets = await readFixture<TcgSet[]>("sets.json");
    const data = setsIndexJsonLd(sets);

    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@type"]).toBe("CollectionPage");
    expect(data.url).toBe(`${BASE}/sets`);
    expect(obj(data.isPartOf)).toEqual({ "@type": "WebSite", url: `${BASE}/` });

    const list = obj(data.mainEntity);
    expect(list["@type"]).toBe("ItemList");
    expect(list.numberOfItems).toBe(sets.length);

    const items = arr(list.itemListElement);
    expect(items).toHaveLength(sets.length);
    expect(items.map((item) => item.position)).toEqual(sets.map((_, i) => i + 1));
    for (const item of items) {
      expect(String(item.url)).toMatch(new RegExp(`^${BASE}/set/[a-z0-9.]+$`, "i"));
    }
    expect(items.map((item) => item.url)).toContain(`${BASE}/set/base1`);
  });
});

describe("articleJsonLd", () => {
  const article = {
    slug: "first-pikachu-card",
    question: "Which was the first Pikachu card?",
    title: "Which was the first Pikachu card?",
    description: "The first Pikachu card was Base Set #58 (January 1999).",
    date: "2026-06-12",
  };

  it("emits a BlogPosting + FAQPage pair", () => {
    const data = arr(articleJsonLd(article));
    expect(data).toHaveLength(2);
    expect(data[0]!["@type"]).toBe("BlogPosting");
    expect(data[1]!["@type"]).toBe("FAQPage");
    for (const node of data) {
      expect(node["@context"]).toBe("https://schema.org");
    }
  });

  it("describes the BlogPosting with headline, dates, language and absolute url", () => {
    const post = arr(articleJsonLd(article))[0]!;
    expect(post.headline).toBe(article.title);
    expect(post.description).toBe(article.description);
    expect(post.datePublished).toBe(article.date);
    expect(post.dateModified).toBe(article.date);
    expect(post.inLanguage).toBe("en");
    expect(post.url).toBe(`${BASE}/facts/${article.slug}`);
    expect(obj(post.mainEntityOfPage)).toEqual({
      "@type": "WebPage",
      "@id": `${BASE}/facts/${article.slug}`,
    });
  });

  it("attributes the BlogPosting to the site as author and publisher", () => {
    const post = arr(articleJsonLd(article))[0]!;
    const org = { "@type": "Organization", name: SITE_NAME, url: `${BASE}/` };
    expect(obj(post.author)).toEqual(org);
    expect(obj(post.publisher)).toEqual(org);
  });

  it("carries an ImageObject pointing at the per-article OG image", () => {
    const post = arr(articleJsonLd(article))[0]!;
    expect(obj(post.image)).toEqual({
      "@type": "ImageObject",
      url: `${BASE}/facts/${article.slug}/opengraph-image`,
      width: 1200,
      height: 630,
    });
  });

  it("mirrors the headline question into the FAQPage answer", () => {
    const faq = arr(articleJsonLd(article))[1]!;
    const questions = arr(faq.mainEntity);
    expect(questions).toHaveLength(1);
    expect(questions[0]!["@type"]).toBe("Question");
    expect(questions[0]!.name).toBe(article.question);
    expect(obj(questions[0]!.acceptedAnswer)).toEqual({
      "@type": "Answer",
      text: article.description,
    });
  });
});

describe("factsCollectionJsonLd", () => {
  const articles = [
    {
      slug: "first-pikachu-card",
      question: "Which was the first Pikachu card?",
      title: "Which was the first Pikachu card?",
      description: "The first Pikachu card was Base Set #58 (January 1999).",
      date: "2026-06-12",
    },
    {
      slug: "how-many-charizard-cards",
      question: "How many Charizard cards are there?",
      title: "How many Charizard cards are there?",
      description: "There are 107 cards named Charizard across 50 sets.",
      date: "2026-06-11",
    },
  ];

  it("emits a Blog tied to the WebSite with one blogPost per article", () => {
    const data = factsCollectionJsonLd(articles);
    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@type"]).toBe("Blog");
    expect(data.url).toBe(`${BASE}/facts`);
    expect(obj(data.isPartOf)).toEqual({ "@type": "WebSite", url: `${BASE}/` });
    expect(arr(data.blogPost)).toHaveLength(articles.length);
  });

  it("describes each nested BlogPosting with headline, date, image, author and absolute url", () => {
    const posts = arr(factsCollectionJsonLd(articles).blogPost);
    const org = { "@type": "Organization", name: SITE_NAME, url: `${BASE}/` };
    posts.forEach((post, index) => {
      expect(post["@type"]).toBe("BlogPosting");
      expect(post.headline).toBe(articles[index]!.title);
      expect(post.description).toBe(articles[index]!.description);
      expect(post.datePublished).toBe(articles[index]!.date);
      expect(post.url).toBe(`${BASE}/facts/${articles[index]!.slug}`);
      expect(obj(post.author)).toEqual(org);
      expect(obj(post.image)).toEqual({
        "@type": "ImageObject",
        url: `${BASE}/facts/${articles[index]!.slug}/opengraph-image`,
        width: 1200,
        height: 630,
      });
    });
  });
});

describe("JsonLd component", () => {
  it("renders a parseable application/ld+json script tag", () => {
    const data = webSiteJsonLd();
    const { container } = render(createElement(JsonLd, { data }));

    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    expect(JSON.parse(script!.textContent ?? "")).toEqual(data);
  });

  it("serializes an array of nodes as a JSON array", () => {
    const { container } = render(
      createElement(JsonLd, { data: [webSiteJsonLd(), faqJsonLd(FAQ_ENTRIES)] }),
    );
    const parsed = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent ?? "",
    ) as Obj[];
    expect(parsed).toHaveLength(2);
    expect(parsed.map((node) => node["@type"])).toEqual(["WebSite", "FAQPage"]);
  });

  it("escapes < so data strings cannot break out of the script context", () => {
    const malicious = '</script><script>alert("pwn")</script>';
    const { container } = render(createElement(JsonLd, { data: { name: malicious } }));

    const script = container.querySelector('script[type="application/ld+json"]')!;
    expect(script.innerHTML).not.toContain("</script");
    expect(script.innerHTML).toContain("\\u003c");
    // The escape is lossless: parsing restores the original string.
    expect(JSON.parse(script.textContent ?? "")).toEqual({ name: malicious });
  });
});
