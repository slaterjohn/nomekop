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

/** Stable @id anchors for the site-level entities (declared in full on the home
 *  page). Every other page references them by @id so all pages resolve to one
 *  Organization / WebSite in the graph rather than anonymous inline objects. */
function orgId(): string {
  return absolute("/#organization");
}
function webSiteId(): string {
  return absolute("/#website");
}
/** `isPartOf` the site, as an @id reference to the WebSite entity. */
function partOfSite(): JsonLdObject {
  return { "@id": webSiteId() };
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
    "@id": orgId(),
    name: SITE_NAME,
    url: absolute("/"),
    description: SITE_DESCRIPTION,
    // A 512×512 logo makes the Organization eligible for Knowledge Panel / logo
    // rich results (Google requires a `logo` on the Organization entity).
    logo: {
      "@type": "ImageObject",
      url: absolute("/icon-512.png"),
      width: 512,
      height: 512,
    },
  };
}

/** Site-wide WebSite entity for the home page, with a Sitelinks Searchbox
 *  pointing at the /sets search. */
export function webSiteJsonLd(): JsonLdObject {
  return {
    "@context": CONTEXT,
    "@type": "WebSite",
    "@id": webSiteId(),
    name: SITE_NAME,
    url: absolute("/"),
    description: SITE_DESCRIPTION,
    publisher: { "@id": orgId() },
    // Sitelinks Searchbox: the /sets index reads ?q to filter sets.
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: absolute("/sets?q={search_term_string}"),
      },
      "query-input": "required name=search_term_string",
    },
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
    offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
    publisher: { "@id": orgId() },
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

/** A plain WebPage node, tied to the site — for tool/landing pages that have no
 *  richer type (e.g. /pokedex). */
export function webPageJsonLd(name: string, path: string, description: string): JsonLdObject {
  return {
    "@context": CONTEXT,
    "@type": "WebPage",
    name,
    url: absolute(path),
    description,
    isPartOf: partOfSite(),
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
 * Offers policy: Google's Product structured data requires one of offers /
 * review / aggregateRating — an offerless Product is a *critical* "Product
 * snippets" error in Search Console, not merely "not rich-eligible." We have
 * only TCGplayer offers, and only for cards TCGplayer has actually listed. So
 * we emit a Product + AggregateOffer for priced cards and **return null** for
 * unpriced ones (common on brand-new sets) — the card page then omits the
 * node entirely. Fabricating prices to satisfy the requirement would violate
 * data honesty, so omission is the correct fix.
 */
export function cardProductJsonLd(card: TcgCard, set: TcgSet): JsonLdObject | null {
  // A variant (normal/holofoil/reverseHolofoil/…) counts as priced when
  // TCGplayer reports a market or low value for it.
  const priced = Object.values(card.tcgplayer?.prices ?? {}).filter(
    (range) => typeof range.market === "number" || typeof range.low === "number",
  );
  // No offers (and we never have review/rating) → no valid Product. Omit it so
  // Search Console doesn't flag an offerless Product.
  if (priced.length === 0) return null;

  // Low bound: the cheapest listing (low), falling back to market.
  const lows = numbers(priced.map((range) => range.low ?? range.market));
  // High bound: market, falling back to mid; if a variant has neither
  // (low-only), fall back to the low pool so max() never sees an empty list.
  const highs = numbers(priced.map((range) => range.market ?? range.mid));
  const highPool = highs.length > 0 ? highs : lows;

  const image = card.imageLarge || card.imageSmall;
  // printedTotal can be 0/undefined for brand-new sets; fall back to total so the
  // product name never reads "…/undefined".
  const setSize = set.printedTotal || set.total;
  return {
    "@context": CONTEXT,
    "@type": "Product",
    name: `${card.name} (${set.name} ${card.number}/${setSize})`,
    ...(image ? { image: [image] } : {}),
    description:
      `${card.name} is a ${card.rarity ?? card.supertype} card from the ` +
      `${set.name} set in the Pokemon TCG ${set.series} series.`,
    sku: card.id,
    brand: { "@type": "Brand", name: "Pokémon TCG" },
    category: "Trading Card",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: Math.min(...lows).toFixed(2),
      highPrice: Math.max(...highPool).toFixed(2),
      offerCount: priced.length,
      ...(card.tcgplayer?.url ? { url: card.tcgplayer.url } : {}),
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "TCGplayer", url: "https://www.tcgplayer.com" },
    },
  };
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
    // Use the actual catalogued count so it agrees with ItemList.numberOfItems
    // (printedTotal is the base size; cards.length includes secret rares).
    description:
      `All ${cards.length} cards of ${set.name}, a Pokemon TCG expansion ` +
      `from the ${set.series} series (${set.releaseDate.slice(0, 4)}) — ` +
      `${set.printedTotal} in the base set plus secret rares, ` +
      "with prices and printable binder layouts.",
    isPartOf: partOfSite(),
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
    isPartOf: partOfSite(),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: sets.length,
      // Newest-first, matching the page's display order so position 1 is the
      // most prominent set (not the oldest).
      itemListElement: [...sets]
        .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
        .map((set, index) => ({
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
  /** Last substantive edit, when different from publication. Absent = unchanged
   *  since `date` (so dateModified honestly equals datePublished). */
  lastModified?: string;
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
  const publisher = { "@id": orgId() };
  return [
    {
      "@context": CONTEXT,
      "@type": "BlogPosting",
      headline: article.title,
      description: article.description,
      image: articleImage(article.slug),
      datePublished: article.date,
      dateModified: article.lastModified ?? article.date,
      inLanguage: "en",
      url,
      // A bare string avoids a dangling WebPage @id with no matching node.
      mainEntityOfPage: url,
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
  const publisher = { "@id": orgId() };
  return {
    "@context": CONTEXT,
    "@type": "Blog",
    "@id": absolute("/facts#blog"),
    name: `${SITE_NAME} — Fun Facts`,
    url: absolute("/facts"),
    description: "Data-driven Pokémon TCG trivia and fun facts from NOMEKOP.",
    isPartOf: partOfSite(),
    publisher,
    blogPost: articles.map((a) => ({
      "@type": "BlogPosting",
      headline: a.title,
      description: a.description,
      image: articleImage(a.slug),
      datePublished: a.date,
      dateModified: a.lastModified ?? a.date,
      inLanguage: "en",
      url: absolute(`/facts/${a.slug}`),
      author: publisher,
      publisher,
    })),
  };
}

/**
 * Single-question FAQPage for an individual /faqs page. The question is the
 * visible <h1> and the answer is the page's visible direct answer, so the
 * markup mirrors on-page content (Google's FAQ policy). FAQ rich results are
 * deprecated, but valid FAQ markup still helps AI Overviews / AI citation.
 */
export function faqPageJsonLd(question: string, answer: string): JsonLdObject {
  return {
    "@context": CONTEXT,
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      },
    ],
  };
}

/** CollectionPage + ItemList for the /faqs index. */
export function faqsIndexJsonLd(
  pages: Array<{ slug: string; question: string; description: string }>,
): JsonLdObject {
  return {
    "@context": CONTEXT,
    "@type": "CollectionPage",
    name: "Pokémon TCG set FAQs",
    url: absolute("/faqs"),
    description:
      "Answers to common questions about the latest Pokémon TCG sets — card counts, " +
      "master sets, binder sizes, rarest and most valuable cards, and more.",
    isPartOf: partOfSite(),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: pages.length,
      itemListElement: pages.map((p, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: p.question,
        url: absolute(`/faqs/${p.slug}`),
      })),
    },
  };
}

/** CollectionPage + ItemList of per-set FAQ hubs for the /faqs index. The index
 *  is a directory of sets (each a card linking to its hub), so the ItemList
 *  points at the hub pages rather than individual questions. */
export function faqsIndexSetsJsonLd(
  sets: Array<{ id: string; fullName: string }>,
): JsonLdObject {
  return {
    "@context": CONTEXT,
    "@type": "CollectionPage",
    name: "Pokémon TCG set FAQs",
    url: absolute("/faqs"),
    description:
      "Pokémon TCG FAQs by set — pick a set for card counts, master-set sizes, the best " +
      "binder, rarest and most valuable cards, chase cards, release dates and more.",
    isPartOf: partOfSite(),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: sets.length,
      itemListElement: sets.map((set, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: `${set.fullName} FAQs`,
        url: absolute(`/faqs/set/${set.id}`),
      })),
    },
  };
}

/** CollectionPage + ItemList for a per-set FAQ hub (/faqs/set/[setId]). */
export function faqSetHubJsonLd(
  setId: string,
  setName: string,
  pages: Array<{ slug: string; question: string }>,
): JsonLdObject {
  return {
    "@context": CONTEXT,
    "@type": "CollectionPage",
    name: `${setName} — Pokémon TCG FAQs`,
    url: absolute(`/faqs/set/${setId}`),
    description: `Common questions and answers about the ${setName} Pokémon TCG set.`,
    isPartOf: partOfSite(),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: pages.length,
      itemListElement: pages.map((p, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: p.question,
        url: absolute(`/faqs/${p.slug}`),
      })),
    },
  };
}
