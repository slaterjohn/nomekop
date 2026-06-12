/**
 * JSON-LD builders for Google rich results. Pure functions returning plain
 * objects, serialized into <script type="application/ld+json"> tags by
 * components/json-ld.tsx. Shapes follow https://schema.org and Google's
 * structured-data guidelines; typed as plain records on purpose so we don't
 * carry a schema-dts dependency.
 */

import type { FaqEntry } from "@/lib/faq";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";
import type { TcgCard, TcgSet } from "@/lib/tcg/types";

export type JsonLdObject = Record<string, unknown>;

const CONTEXT = "https://schema.org";

/** Absolute URL for a site-relative path: "/set/base1" → "https://…/set/base1". */
function absolute(path: string): string {
  return `${siteUrl()}${path}`;
}

/** Keeps only real numbers — narrows `number | undefined` unions from PriceRange. */
function numbers(values: Array<number | undefined>): number[] {
  return values.filter((value): value is number => typeof value === "number");
}

/** Top-level Organization entity for the home page. A dedicated, named
 *  Organization (rather than only inline publisher objects) gives LLMs and
 *  rich-results a confident anchor for who produces the site. */
export function organizationJsonLd(): JsonLdObject {
  return {
    "@context": CONTEXT,
    "@type": "Organization",
    name: SITE_NAME,
    url: absolute("/"),
    description: SITE_DESCRIPTION,
    creator: { "@type": "Organization", name: SITE_NAME },
  };
}

/** Site-wide WebSite entity for the home page. */
export function webSiteJsonLd(): JsonLdObject {
  return {
    "@context": CONTEXT,
    "@type": "WebSite",
    name: SITE_NAME,
    url: absolute("/"),
    description: SITE_DESCRIPTION,
    publisher: { "@type": "Organization", name: SITE_NAME, url: absolute("/") },
  };
}

/** The builder as a free web app (price 0 — Nomekop has no paid tier). */
export function webApplicationJsonLd(): JsonLdObject {
  return {
    "@context": CONTEXT,
    "@type": "WebApplication",
    name: SITE_NAME,
    url: absolute("/"),
    description: SITE_DESCRIPTION,
    applicationCategory: "UtilityApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}

/**
 * FAQPage from the home-page FAQ. Google's policy requires the Q&A content to
 * be visible on the page — components/faq-section.tsx renders these exact
 * entries, so the markup mirrors visible content verbatim.
 */
export function faqJsonLd(entries: readonly FaqEntry[]): JsonLdObject {
  return {
    "@context": CONTEXT,
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}

export type BreadcrumbItem = {
  name: string;
  /** Site-relative path ("/", "/sets", "/set/base1", …). */
  path: string;
};

/** BreadcrumbList with 1-based positions and absolute item URLs. */
export function breadcrumbJsonLd(items: BreadcrumbItem[]): JsonLdObject {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  };
}

/**
 * Product entity for a card page.
 *
 * Offers policy: Google "product snippets" only become rich-result-eligible
 * when a Product carries offers (or review/rating) — but fabricating prices
 * would violate the data-honesty requirement. So we emit an AggregateOffer
 * over the TCGplayer per-variant price ranges when market data exists, and a
 * plain offerless Product otherwise (common for 2026+ sets where TCGplayer
 * has not listed cards yet). An offerless Product is still valid schema.org —
 * it simply is not rich-eligible.
 */
export function cardProductJsonLd(card: TcgCard, set: TcgSet): JsonLdObject {
  const image = card.imageLarge || card.imageSmall;
  const product: JsonLdObject = {
    "@context": CONTEXT,
    "@type": "Product",
    name: `${card.name} (${set.name} ${card.number}/${set.printedTotal})`,
    ...(image ? { image: [image] } : {}),
    description:
      `${card.name} is a ${card.rarity ?? card.supertype} card from the ` +
      `${set.name} set in the Pokemon TCG ${set.series} series.`,
    sku: card.id,
    brand: { "@type": "Brand", name: "Pokémon TCG" },
    category: "Trading Card",
  };

  // A variant (normal/holofoil/reverseHolofoil/…) counts as priced when
  // TCGplayer reports a market or low value for it.
  const priced = Object.values(card.tcgplayer?.prices ?? {}).filter(
    (range) => typeof range.market === "number" || typeof range.low === "number",
  );
  if (priced.length > 0) {
    // Low bound: the cheapest listing (low), falling back to market.
    const lows = numbers(priced.map((range) => range.low ?? range.market));
    // High bound: market, falling back to mid; if a variant has neither
    // (low-only), fall back to the low pool so max() never sees an empty list.
    const highs = numbers(priced.map((range) => range.market ?? range.mid));
    const highPool = highs.length > 0 ? highs : lows;
    product.offers = {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: Math.min(...lows).toFixed(2),
      highPrice: Math.max(...highPool).toFixed(2),
      offerCount: priced.length,
      ...(card.tcgplayer?.url ? { url: card.tcgplayer.url } : {}),
      availability: "https://schema.org/InStock",
    };
  }

  return product;
}

/** ItemList entries are capped to keep the JSON-LD payload sane on large sets
 *  (250+ cards would add tens of KB of HTML); numberOfItems still reports the
 *  full count so crawlers know the list is truncated. */
const COLLECTION_ITEM_CAP = 50;

/** CollectionPage + ItemList for a /set/[setId] hub page. */
export function setCollectionJsonLd(set: TcgSet, cards: TcgCard[]): JsonLdObject {
  return {
    "@context": CONTEXT,
    "@type": "CollectionPage",
    name: `${set.name} card list & binder layout`,
    url: absolute(`/set/${set.id}`),
    description:
      `All cards of ${set.name}, a ${set.printedTotal}-card Pokemon TCG expansion ` +
      `from the ${set.series} series (${set.releaseDate.slice(0, 4)}), ` +
      "with prices and printable binder layouts.",
    isPartOf: { "@type": "WebSite", url: absolute("/") },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: cards.length,
      itemListElement: cards.slice(0, COLLECTION_ITEM_CAP).map((card, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: card.name,
        url: absolute(`/card/${card.id}`),
      })),
    },
  };
}

/** CollectionPage + ItemList of every set for the /sets index. */
export function setsIndexJsonLd(sets: TcgSet[]): JsonLdObject {
  return {
    "@context": CONTEXT,
    "@type": "CollectionPage",
    name: "All Pokemon TCG sets",
    url: absolute("/sets"),
    description:
      "Every Pokemon TCG expansion by series with card lists, prices and " +
      "printable A4 binder layouts.",
    isPartOf: { "@type": "WebSite", url: absolute("/") },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: sets.length,
      itemListElement: sets.map((set, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: set.name,
        url: absolute(`/set/${set.id}`),
      })),
    },
  };
}

type ArticleMeta = {
  slug: string;
  question: string;
  title: string;
  description: string;
  date: string;
};

/** ImageObject for an article's per-segment dynamic Open Graph image. Next.js
 *  serves app/facts/[slug]/opengraph-image.tsx at this path (1200×630, the
 *  size exported there); referencing it gives BlogPosting a schema.org-
 *  recommended `image` without shipping a separate asset. */
function articleImage(slug: string): JsonLdObject {
  return {
    "@type": "ImageObject",
    url: absolute(`/facts/${slug}/opengraph-image`),
    width: 1200,
    height: 630,
  };
}

/**
 * For a fun-fact article: a BlogPosting plus a single-question FAQPage. The
 * headline question is answered visibly on the page (h1 + opening paragraph),
 * so the FAQ markup mirrors real content — strong for both rich results and
 * generative-engine (LLM) citation.
 */
export function articleJsonLd(article: ArticleMeta): JsonLdObject[] {
  const url = absolute(`/facts/${article.slug}`);
  const publisher = { "@type": "Organization", name: SITE_NAME, url: absolute("/") };
  return [
    {
      "@context": CONTEXT,
      "@type": "BlogPosting",
      headline: article.title,
      description: article.description,
      image: articleImage(article.slug),
      datePublished: article.date,
      dateModified: article.date,
      inLanguage: "en",
      url,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      author: publisher,
      publisher,
    },
    {
      "@context": CONTEXT,
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: article.question,
          acceptedAnswer: { "@type": "Answer", text: article.description },
        },
      ],
    },
  ];
}

/** Blog entity for the /facts index. */
export function factsCollectionJsonLd(articles: ArticleMeta[]): JsonLdObject {
  const publisher = { "@type": "Organization", name: SITE_NAME, url: absolute("/") };
  return {
    "@context": CONTEXT,
    "@type": "Blog",
    name: `${SITE_NAME} — Fun Facts`,
    url: absolute("/facts"),
    description: "Data-driven Pokémon TCG trivia and fun facts from NOMEKOP.",
    isPartOf: { "@type": "WebSite", url: absolute("/") },
    publisher,
    blogPost: articles.map((a) => ({
      "@type": "BlogPosting",
      headline: a.title,
      description: a.description,
      image: articleImage(a.slug),
      datePublished: a.date,
      url: absolute(`/facts/${a.slug}`),
      author: publisher,
      publisher,
    })),
  };
}
