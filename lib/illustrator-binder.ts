import { paginate, toSpreads, type Slot } from "@/lib/layout";
import type { BinderLayout } from "@/lib/layout";
import { orderForBinder } from "@/lib/binder-order";
import { displayNameFromSlug } from "@/lib/pokemon-binder";
import { decodeLanguages, encodeLanguages } from "@/lib/tcg/languages";
import type { CardWithSet } from "@/lib/tcg/types";

// A binder for every card drawn by one illustrator, across every set.
// Token URLs: /illustrator/<slug>~<rows><cols><order>[<langs>]
//   order: n = newest set first · o = oldest set first
//   langs: optional language chars (e=en, j=ja…); absent = English only
// No filter dimension: an artist's body of work is the whole point.

export type IllustratorOrder = "new" | "old";

export type IllustratorBinderOptions = {
  rows: number;
  cols: number;
  order: IllustratorOrder;
  /** Languages to mix into the binder; always includes "en". */
  langs: string[];
};

export const DEFAULT_ILLUSTRATOR_OPTIONS: IllustratorBinderOptions = {
  rows: 3,
  cols: 4,
  order: "new",
  langs: ["en"],
};

const ORDER_CH: Record<IllustratorOrder, string> = { new: "n", old: "o" };

/** Lowercased, spaces → dashes; keeps letters/digits/'./- (e.g. "5ban Graphics"
 *  → "5ban-graphics"). Mirrors the Pokémon slug grammar. */
export function slugifyArtistName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

export { displayNameFromSlug };

/** Compact language suffix; empty for English-only so default URLs stay clean. */
function langSuffix(langs: string[]): string {
  return langs.some((l) => l !== "en") ? encodeLanguages(langs) : "";
}

export function encodeIllustratorToken(name: string, options: IllustratorBinderOptions): string {
  return `${slugifyArtistName(name)}~${options.rows}${options.cols}${ORDER_CH[options.order]}${langSuffix(options.langs)}`;
}

// The slug half of a token is free text lifted straight from a credit line, so
// it cannot be an allow-list: pokemontcg.io credits real artists as
// `"Big Mama" Tagawa, CR CG gangs`, `Nobusawa/Mochipuyo`, `Imakuni?` and
// `Shinji Higuchi + Noriko Takaya`, and every character an allow-list forgets
// costs that artist their ONLY reachable URL. So match anything except the two
// things that would genuinely break parsing:
//   `~`   the delimiter — excluding it makes the split unambiguous (the slug is
//         everything before the FIRST tilde, and a second tilde cannot appear)
//   \p{Cc} control characters, which no URL can carry and which only ever arrive
//         from a hand-crafted percent-escape
// `/` is deliberately allowed. It is illegal RAW in a path segment but legal as
// %2F, so the token still occupies one segment — provided the link builder
// percent-encodes it (encodeSegmentPath) and the router hands the escape back
// undecoded, which it does. See test/unit/binder-token-urls.test.ts.
const TOKEN_RE = /^([^~\p{Cc}]{2,40})~([1-5])([1-5])([no])([a-z]*)$/iu;

export function decodeIllustratorToken(
  token: string,
): { name: string; options: IllustratorBinderOptions } | null {
  const m = TOKEN_RE.exec(token);
  if (!m) return null;
  const [, slug, rows, cols, order, langs] = m;
  return {
    name: slug!.toLowerCase(),
    options: {
      rows: Number.parseInt(rows!, 10),
      cols: Number.parseInt(cols!, 10),
      order: order!.toLowerCase() === "o" ? "old" : "new",
      langs: decodeLanguages((langs ?? "").toLowerCase()),
    },
  };
}

/** Same BinderLayout shape the preview/print/PDF pipeline already speaks. */
export function buildIllustratorLayout(
  cards: ReadonlyArray<CardWithSet>,
  options: IllustratorBinderOptions,
): BinderLayout {
  const sorted = orderForBinder([...cards], options.order, options.langs.length > 1);
  const slots: Slot[] = sorted.map((card) => ({ kind: "card", card }));
  const pages = paginate(slots, options.rows, options.cols);
  return {
    pages,
    spreads: toSpreads(pages),
    stats: {
      cards: sorted.length,
      slots: slots.length,
      pages: pages.length,
      slotsPerPage: options.rows * options.cols,
      rows: options.rows,
      cols: options.cols,
      byKind: { card: slots.length, reverse: 0, pokeball: 0, masterball: 0, energy: 0 },
    },
  };
}
