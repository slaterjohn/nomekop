/** A reference to a specific card, used in answers and links. */
export type FaqCardRef = {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  /** Highest TCGplayer market value across variants, when priced. */
  marketPrice?: number;
  /** Small scan URL (pokemontcg.io / scrydex), for linked card thumbnails. */
  imageSmall?: string;
  /** Hi-res scan URL, when available. */
  imageLarge?: string;
};

export type FaqPokemon = {
  /** Species slug for the URL and /pokemon binder link (e.g. "umbreon"). */
  slug: string;
  /** Display species name (e.g. "Umbreon"). */
  displayName: string;
  /** Every print of the species in the set, lowest number first. */
  cards: FaqCardRef[];
};

/** All the figures one set contributes to its FAQ pages. */
export type FaqSetFacts = {
  id: string;
  name: string;
  slug: string;
  series: string;
  /** Set logo image URL (pokemontcg.io / scrydex). */
  logoUrl: string;
  /** Set symbol image URL (pokemontcg.io / scrydex). */
  symbolUrl: string;
  releaseDate: string; // YYYY/MM/DD
  printedTotal: number;
  total: number;
  secretCount: number;
  pokemonCount: number;
  trainerCount: number;
  energyCount: number;
  reverseHoloCount: number;
  masterSetCount: number;
  pokeballCount: number;
  masterballCount: number;
  hasBallPatterns: boolean;
  illustrationRareCount: number;
  rarityHistogram: Record<string, number>;
  rarestCard: FaqCardRef;
  mostValuableCard?: FaqCardRef; // absent when the set has no price data
  chaseCards: FaqCardRef[];
  marqueePokemon: FaqPokemon[];
  /** 1 = largest printedTotal among the 20 sets in scope. */
  sizeRankAmongRecent: number;
};

export type FaqSnapshot = {
  asOf: string;
  sets: FaqSetFacts[];
};

export type FaqType =
  | "card-count"
  | "master-set"
  | "binder-size"
  | "rarest-card"
  | "valuable-card"
  | "chase-cards"
  | "secret-rares"
  | "illustration-rares"
  | "reverse-holos"
  | "release-date"
  | "ball-patterns"
  | "pokemon-in-set"
  /** Hand-authored pre-release page for an upcoming set (see upcoming.ts). */
  | "upcoming";

/**
 * A set as it appears on the FAQ index card / per-set hub — released or
 * upcoming, unified into one shape. `logoUrl`/`releaseDate`/`infoHref` are
 * absent for upcoming sets (no card data or /set page yet); `releaseLabel`/
 * `order` are present only for upcoming sets.
 */
export type FaqSetSummary = {
  id: string;
  /** Card label — short name for upcoming sets, full set name otherwise. */
  name: string;
  /** Longer name for titles/metadata (full official name for upcoming sets). */
  fullName: string;
  era: string;
  slug: string;
  logoUrl?: string;
  symbolUrl?: string;
  /** YYYY/MM/DD (released sets only — used for sorting). */
  releaseDate?: string;
  /** Human release label, e.g. "July 17, 2026" (upcoming only). */
  releaseLabel?: string;
  /** Soonest-first order index among upcoming sets (upcoming only). */
  order?: number;
  faqCount: number;
  isUpcoming: boolean;
  /** /faqs/set/<id> — the per-set FAQ hub. */
  hubHref: string;
  /** /set/<id> info page — released sets only (upcoming have no /set page). */
  infoHref?: string;
};

/** An era and its sets, in display order (upcoming first, then newest-first). */
export type FaqEraGroup = { era: string; sets: FaqSetSummary[] };

/** A single rendered FAQ page. */
export type FaqPage = {
  slug: string;
  type: FaqType;
  setId: string;
  /** Visible <h1> AND schema Question.name. */
  question: string;
  /** <title>. */
  title: string;
  /** Meta description AND the direct answer mirrored verbatim as page text and
   *  schema acceptedAnswer. */
  description: string;
  /** Markdown body (no H1). */
  body: string;
  /** Contextual CTAs + cross-question links (app routes + other FAQ slugs). */
  related: { href: string; label: string }[];
  /** Cards this page is about, rendered as a linked thumbnail strip. Absent on
   *  pages with no specific cards (e.g. hand-authored upcoming pages). */
  cards?: FaqCardRef[];
};
