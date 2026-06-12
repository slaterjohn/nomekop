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
};

export type Variants = {
  normal: boolean;
  reverse: boolean;
  holo: boolean;
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
  /** Absent when the API has no market data (common for 2026+ sets). */
  tcgplayer?: TcgPlayerInfo;
};

export interface CardDataSource {
  getSets(): Promise<TcgSet[]>;
  getCards(setId: string): Promise<TcgCard[]>;
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
