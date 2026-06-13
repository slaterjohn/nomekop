export type TcgSet = {
  id: string;
  name: string;
  series: string;
  /** Cards in the printed set numbering (secret rares sit above this). */
  printedTotal: number;
  /** All cards the API knows for the set, including secrets/subsets. */
  total: number;
  /** 'YYYY/MM/DD' as served by pokemontcg.io. */
  releaseDate: string;
  symbolUrl: string;
  logoUrl: string;
  /** Language code (en, ja…). Absent = English (pokemontcg.io). */
  lang?: string;
};

export type Variants = {
  normal: boolean;
  reverse: boolean;
  holo: boolean;
  /** Poké Ball / Master Ball foil mirrors (curated per set — the API has no
   *  per-card data for these). Optional: absent in older cached payloads. */
  pokeball?: boolean;
  masterball?: boolean;
};

export type PriceRange = {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  directLow?: number;
};

export type TcgPlayerInfo = {
  url?: string;
  updatedAt?: string;
  /** Keyed by print variant: normal, holofoil, reverseHolofoil, 1stEdition… */
  prices?: Record<string, PriceRange>;
};

export type TcgCard = {
  id: string;
  name: string;
  /** Printed collector number: '4', '85a', 'TG01', 'SV001'… */
  number: string;
  rarity: string | undefined;
  supertype: string;
  imageSmall: string;
  imageLarge: string;
  variants: Variants;
  /** National Pokédex numbers (absent for Trainers/Energy). */
  dex?: number[];
  /** Illustrator credited on the card (absent in older cached payloads). */
  artist?: string;
  /** Absent when the API has no market data (common for 2026+ sets). */
  tcgplayer?: TcgPlayerInfo;
  /** Language code (en, ja, fr…). Absent in older cached payloads = English. */
  lang?: string;
};

/** A card carrying its set context — used by cross-set queries
 *  (Pokémon binders, the Pokédex) where the set isn't implicit. */
export type CardWithSet = TcgCard & {
  setId: string;
  setName: string;
  setReleaseDate: string;
  setPrintedTotal: number;
  /** Numbered beyond the printed total or in a lettered subset. */
  secret: boolean;
};

export interface CardDataSource {
  getSets(): Promise<TcgSet[]>;
  getCards(setId: string): Promise<TcgCard[]>;
  /** All prints whose name contains `name` (case-insensitive). */
  searchCardsByName(name: string): Promise<CardWithSet[]>;
  /** All prints illustrated by `artist` (case-insensitive). */
  searchCardsByArtist(artist: string): Promise<CardWithSet[]>;
  /** All prints for Pokémon in a National Dex number range (inclusive). */
  getCardsByDexRange(min: number, max: number): Promise<CardWithSet[]>;
}

export type TcgErrorKind = "timeout" | "http" | "network" | "parse" | "unknown-set";

export class TcgError extends Error {
  constructor(
    public kind: TcgErrorKind,
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "TcgError";
  }
}
