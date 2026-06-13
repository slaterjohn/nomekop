import type { TcgSet } from "@/lib/tcg/types";

// Overlay localized (TCGdex) sets onto the English (pokemontcg.io) set list.
//
// The two sources use different set ids (pokemontcg "me4" vs TCGdex "me04"), but
// TCGdex's *English* names match pokemontcg.io's exactly — so TCGdex's English
// set list is the bridge: localized set id -> its English name -> the English
// set. From there:
//   • same name as English  -> badge the English entry with the language code
//   • a translated name      -> interleave it right beside its English entry
//   • no English counterpart -> a language-exclusive set, listed on its own

export type LocalizedSetRef = {
  lang: string;
  /** TCGdex set id (links to /lset/<lang>/<id>). */
  localizedId: string;
  /** The set's name in this language. */
  name: string;
  /** Max cards, for the "<n> cards" line. */
  total: number;
};

export type SetOverlay = {
  /** English set id -> a localized set sharing its English name (badge it). */
  badges: Map<string, LocalizedSetRef>;
  /** English set id -> localized sets with a translated name (show beside it). */
  variants: Map<string, LocalizedSetRef[]>;
  /** Localized sets with no English counterpart, newest first. */
  exclusive: LocalizedSetRef[];
};

function norm(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export const EMPTY_OVERLAY: SetOverlay = {
  badges: new Map(),
  variants: new Map(),
  exclusive: [],
};

/**
 * Match a language's TCGdex sets against the English set list. Pure — the page's
 * server component does the fetching and passes the three lists in.
 *
 * `curated` (localized set id → English set name) covers languages whose TCGdex
 * set ids/names don't bridge automatically (Japanese etc.); it takes precedence
 * over the TCGdex-English-name bridge.
 */
export function buildSetOverlay(
  englishSets: ReadonlyArray<TcgSet>,
  tcgdexEnSets: ReadonlyArray<TcgSet>,
  tcgdexLangSets: ReadonlyArray<TcgSet>,
  lang: string,
  curated: Record<string, string> = {},
): SetOverlay {
  // Normalized English name -> pokemontcg.io set id.
  const englishIdByName = new Map<string, string>();
  for (const set of englishSets) englishIdByName.set(norm(set.name), set.id);
  // TCGdex set id -> its English name (the bridge across the two id schemes).
  const englishNameByTcgdexId = new Map<string, string>();
  for (const set of tcgdexEnSets) englishNameByTcgdexId.set(set.id, set.name);

  const badges = new Map<string, LocalizedSetRef>();
  const variants = new Map<string, LocalizedSetRef[]>();
  const exclusive: LocalizedSetRef[] = [];

  for (const set of tcgdexLangSets) {
    const ref: LocalizedSetRef = {
      lang,
      localizedId: set.id,
      name: set.name,
      total: Math.max(set.printedTotal, set.total),
    };
    // Curated link wins (authoritative for ja/ko/zh); else the TCGdex-en bridge.
    const englishName = curated[set.id] ?? englishNameByTcgdexId.get(set.id);
    const englishId = englishName ? englishIdByName.get(norm(englishName)) : undefined;
    if (englishId && englishName) {
      if (norm(set.name) === norm(englishName)) {
        badges.set(englishId, ref);
      } else {
        const list = variants.get(englishId) ?? [];
        list.push(ref);
        variants.set(englishId, list);
      }
    } else {
      exclusive.push(ref);
    }
  }
  // TCGdex lists sets oldest-first; show language-exclusive ones newest-first.
  exclusive.reverse();
  return { badges, variants, exclusive };
}
