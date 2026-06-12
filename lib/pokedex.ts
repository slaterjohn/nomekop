import { rarityRank } from "@/lib/tcg/rarity";
import type { CardWithSet } from "@/lib/tcg/types";

// The Pokédex binder: one pocket per Pokémon, in National Dex order.
// Token URLs: /pokedex/<gen>~<rows><cols>[~<picks>]
//   picks = "<dex>.<cardId>" pairs joined by "_" — only user overrides are
//   encoded, so default links stay tiny and custom ones stay shareable.

export type GenerationId = "g1" | "g2" | "g3" | "g4" | "g5" | "g6" | "g7" | "g8" | "g9";

export type Generation = { id: GenerationId; label: string; region: string; min: number; max: number };

export const GENERATIONS: Generation[] = [
  { id: "g1", label: "GEN I", region: "Kanto", min: 1, max: 151 },
  { id: "g2", label: "GEN II", region: "Johto", min: 152, max: 251 },
  { id: "g3", label: "GEN III", region: "Hoenn", min: 252, max: 386 },
  { id: "g4", label: "GEN IV", region: "Sinnoh", min: 387, max: 493 },
  { id: "g5", label: "GEN V", region: "Unova", min: 494, max: 649 },
  { id: "g6", label: "GEN VI", region: "Kalos", min: 650, max: 721 },
  { id: "g7", label: "GEN VII", region: "Alola", min: 722, max: 809 },
  { id: "g8", label: "GEN VIII", region: "Galar/Hisui", min: 810, max: 905 },
  { id: "g9", label: "GEN IX", region: "Paldea", min: 906, max: 1025 },
];

export function generationById(id: string): Generation | null {
  return GENERATIONS.find((g) => g.id === id) ?? null;
}

export type PokedexConfig = {
  gen: GenerationId;
  rows: number;
  cols: number;
  /** dex number → chosen card id (only divergences from the default pick). */
  picks: Record<number, string>;
};

const CARD_ID_RE = /^[a-z0-9.]+-[a-z0-9]+$/i;

export function encodePokedexToken(config: PokedexConfig): string {
  const base = `${config.gen}~${config.rows}${config.cols}`;
  const pairs = Object.entries(config.picks)
    .map(([dex, id]) => [Number(dex), id] as const)
    .sort((a, b) => a[0] - b[0])
    .map(([dex, id]) => `${dex}.${id}`);
  return pairs.length > 0 ? `${base}~${pairs.join("_")}` : base;
}

export function decodePokedexToken(token: string): PokedexConfig | null {
  const m = /^(g[1-9])~([1-5])([1-5])(?:~(.+))?$/.exec(token);
  if (!m) return null;
  const gen = generationById(m[1]!);
  if (!gen) return null;
  const picks: Record<number, string> = {};
  if (m[4]) {
    for (const pair of m[4].split("_")) {
      const dot = pair.indexOf(".");
      if (dot <= 0) return null;
      const dex = Number.parseInt(pair.slice(0, dot), 10);
      const cardId = pair.slice(dot + 1);
      if (!Number.isInteger(dex) || dex < gen.min || dex > gen.max) return null;
      if (!CARD_ID_RE.test(cardId)) return null;
      picks[dex] = cardId;
    }
  }
  return {
    gen: gen.id,
    rows: Number.parseInt(m[2]!, 10),
    cols: Number.parseInt(m[3]!, 10),
    picks,
  };
}

export type PokedexEntry = {
  dex: number;
  /** The card in this pocket (override → default pick), or null when no card exists. */
  chosen: CardWithSet | null;
  /** Every print available for this Pokémon, rarest first (for the swap dialog). */
  alternatives: CardWithSet[];
};

/** Default pick: a secret card when one exists, otherwise the rarest print;
 *  newest set breaks ties. */
function defaultPick(prints: CardWithSet[]): CardWithSet | null {
  if (prints.length === 0) return null;
  return [...prints].sort((a, b) => {
    if (a.secret !== b.secret) return a.secret ? -1 : 1;
    const byRarity = rarityRank(b.rarity) - rarityRank(a.rarity);
    if (byRarity !== 0) return byRarity;
    return b.setReleaseDate.localeCompare(a.setReleaseDate);
  })[0]!;
}

export function buildPokedexEntries(
  genId: GenerationId,
  cards: ReadonlyArray<CardWithSet>,
  picks: Record<number, string>,
): PokedexEntry[] {
  const gen = generationById(genId)!;
  const byDex = new Map<number, CardWithSet[]>();
  for (const card of cards) {
    for (const dex of card.dex ?? []) {
      if (dex < gen.min || dex > gen.max) continue;
      const list = byDex.get(dex) ?? [];
      list.push(card);
      byDex.set(dex, list);
    }
  }

  const entries: PokedexEntry[] = [];
  for (let dex = gen.min; dex <= gen.max; dex++) {
    const prints = byDex.get(dex) ?? [];
    const alternatives = [...prints].sort(
      (a, b) =>
        rarityRank(b.rarity) - rarityRank(a.rarity) ||
        b.setReleaseDate.localeCompare(a.setReleaseDate),
    );
    const override = picks[dex] ? prints.find((c) => c.id === picks[dex]) : undefined;
    entries.push({ dex, chosen: override ?? defaultPick(prints), alternatives });
  }
  return entries;
}

/** Consistent pixel-art Pokémon icons (PokeAPI Gen-VIII menu sprites).
 *  Coverage verified: dex 1–898; later Pokémon return null (pokeball fallback). */
const SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons";
const SPRITE_MAX_DEX = 898;

export function spriteUrl(dex: number): string | null {
  if (dex < 1 || dex > SPRITE_MAX_DEX) return null;
  return `${SPRITE_BASE}/${dex}.png`;
}

export const POKEDEX_STORAGE_PREFIX = "bindermon:v1:pokedex";
