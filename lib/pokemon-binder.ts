import { paginate, toSpreads, type Slot } from "@/lib/layout";
import type { BinderLayout } from "@/lib/layout";
import { orderForBinder } from "@/lib/binder-order";
import { rarityRank } from "@/lib/tcg/rarity";
import { decodeLanguages, encodeLanguages } from "@/lib/tcg/languages";
import type { CardWithSet } from "@/lib/tcg/types";

// A binder for one Pokémon across every set it has appeared in.
// Token URLs: /pokemon/<slug>~<rows><cols><filter><order>[<langs>]
//   filter: a = all prints · s = secret cards only · b = best (rarest) per set
//   order:  n = newest set first · o = oldest set first
//   langs:  optional language chars (e=en, j=ja…); absent = English only

export type PokemonFilter = "all" | "secret" | "best";
export type PokemonOrder = "new" | "old";

export type PokemonBinderOptions = {
  rows: number;
  cols: number;
  filter: PokemonFilter;
  order: PokemonOrder;
  /** Languages to mix into the binder; always includes "en". */
  langs: string[];
};

export const DEFAULT_POKEMON_OPTIONS: PokemonBinderOptions = {
  rows: 3,
  cols: 4,
  filter: "all",
  order: "new",
  langs: ["en"],
};

const FILTER_CH: Record<PokemonFilter, string> = { all: "a", secret: "s", best: "b" };
const ORDER_CH: Record<PokemonOrder, string> = { new: "n", old: "o" };

/** Lowercased, spaces → dashes; keeps letters/digits/'./- and ♀♂-safe chars. */
export function slugifyPokemonName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

/** Compact language suffix; empty for English-only so default URLs stay clean. */
function langSuffix(langs: string[]): string {
  return langs.some((l) => l !== "en") ? encodeLanguages(langs) : "";
}

export function encodePokemonToken(name: string, options: PokemonBinderOptions): string {
  return `${slugifyPokemonName(name)}~${options.rows}${options.cols}${FILTER_CH[options.filter]}${ORDER_CH[options.order]}${langSuffix(options.langs)}`;
}

const TOKEN_RE = /^([a-z0-9.'\-:♀♂é ]{2,40})~([1-5])([1-5])([asb])([no])([a-z]*)$/i;

export function decodePokemonToken(
  token: string,
): { name: string; options: PokemonBinderOptions } | null {
  const m = TOKEN_RE.exec(token);
  if (!m) return null;
  const [, slug, rows, cols, filter, order, langs] = m;
  return {
    name: slug!.toLowerCase(),
    options: {
      rows: Number.parseInt(rows!, 10),
      cols: Number.parseInt(cols!, 10),
      filter: filter!.toLowerCase() === "s" ? "secret" : filter!.toLowerCase() === "b" ? "best" : "all",
      order: order!.toLowerCase() === "o" ? "old" : "new",
      langs: decodeLanguages((langs ?? "").toLowerCase()),
    },
  };
}

/** The display name implied by a slug ("mr.-mime" → "Mr. Mime"). */
export function displayNameFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => (part ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function applyFilter(cards: CardWithSet[], filter: PokemonFilter): CardWithSet[] {
  switch (filter) {
    case "secret":
      return cards.filter((c) => c.secret);
    case "best": {
      const bestPerSet = new Map<string, CardWithSet>();
      for (const card of cards) {
        const current = bestPerSet.get(card.setId);
        if (!current || rarityRank(card.rarity) > rarityRank(current.rarity)) {
          bestPerSet.set(card.setId, card);
        }
      }
      return [...bestPerSet.values()];
    }
    default:
      return cards;
  }
}

/** Same BinderLayout shape the preview/print/PDF pipeline already speaks. */
export function buildPokemonLayout(
  cards: ReadonlyArray<CardWithSet>,
  options: PokemonBinderOptions,
): BinderLayout {
  const filtered = orderForBinder(
    applyFilter([...cards], options.filter),
    options.order,
    options.langs.length > 1,
  );
  const slots: Slot[] = filtered.map((card) => ({ kind: "card", card }));
  const pages = paginate(slots, options.rows, options.cols);
  return {
    pages,
    spreads: toSpreads(pages),
    stats: {
      cards: filtered.length,
      slots: slots.length,
      pages: pages.length,
      slotsPerPage: options.rows * options.cols,
      rows: options.rows,
      cols: options.cols,
      byKind: { card: slots.length, reverse: 0, pokeball: 0, masterball: 0 },
    },
  };
}
