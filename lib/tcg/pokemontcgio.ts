import {
  TcgError,
  type CardDataSource,
  type CardWithSet,
  type PriceRange,
  type TcgCard,
  type TcgPlayerInfo,
  type TcgSet,
} from "@/lib/tcg/types";
import { deriveVariants } from "@/lib/tcg/variants";
import { applyBallPatterns } from "@/lib/tcg/ball-patterns";
import { isSecretNumber } from "@/lib/tcg/secret";

const BASE = "https://api.pokemontcg.io/v2";
const PAGE_SIZE = 250;

type ApiSet = {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string;
  images?: { symbol?: string; logo?: string };
};

type ApiCard = {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  supertype?: string;
  nationalPokedexNumbers?: number[];
  artist?: string;
  images?: { small?: string; large?: string };
  set: ApiSet;
  tcgplayer?: {
    url?: string;
    updatedAt?: string;
    prices?: Record<string, Record<string, unknown>>;
  };
};

type Options = {
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number[];
};

/**
 * pokemontcg.io v2 client. The API is fast on good days and 15s+ on bad ones,
 * so every request carries a timeout, bounded retries with backoff, and the
 * caller layers a stale-while-revalidate cache on top.
 */
export class PokemonTcgIoSource implements CardDataSource {
  private timeoutMs: number;
  private retries: number;
  private backoffMs: number[];

  constructor(opts: Options = {}) {
    this.timeoutMs = opts.timeoutMs ?? 25_000;
    this.retries = opts.retries ?? 2;
    this.backoffMs = opts.backoffMs ?? [1_000, 3_000];
  }

  async getSets(): Promise<TcgSet[]> {
    const sets: TcgSet[] = [];
    let page = 1;
    for (;;) {
      const body = await this.request(`/sets?pageSize=${PAGE_SIZE}&page=${page}&orderBy=releaseDate`);
      const data = (body.data ?? []) as ApiSet[];
      sets.push(...data.map(mapSet));
      const total = typeof body.totalCount === "number" ? body.totalCount : sets.length;
      if (sets.length >= total || data.length === 0) return sets;
      page += 1;
    }
  }

  async getCards(setId: string): Promise<TcgCard[]> {
    const cards: TcgCard[] = [];
    let page = 1;
    for (;;) {
      const q = encodeURIComponent(`set.id:${setId}`);
      const body = await this.request(`/cards?q=${q}&pageSize=${PAGE_SIZE}&page=${page}&orderBy=number`);
      const data = (body.data ?? []) as ApiCard[];
      cards.push(...data.map(mapCard));
      const total = typeof body.totalCount === "number" ? body.totalCount : cards.length;
      if (cards.length >= total || data.length === 0) return applyBallPatterns(setId, cards);
      page += 1;
    }
  }

  async searchCardsByName(name: string): Promise<CardWithSet[]> {
    // Slug separators become wildcards: "mr.-mime" → *mr.*mime* (matches
    // "Mr. Mime"), "ho-oh" → *ho*oh* (matches "Ho-Oh"). Also matches variants
    // like "Charizard ex" and "Dark Charizard" by design.
    const fuzzy = name.replace(/"/g, "").replace(/[\s-]+/g, "*");
    return this.pagedCardsWithSet(`name:"*${fuzzy}*"`);
  }

  async searchCardsByArtist(artist: string): Promise<CardWithSet[]> {
    // Slug separators become wildcards so a token slug ("ken-sugimori") matches
    // "Ken Sugimori", and wildcards on both ends catch trailing collaborator
    // credits ("Ken Sugimori & 5ban Graphics").
    const fuzzy = artist.replace(/"/g, "").replace(/[\s-]+/g, "*");
    return this.pagedCardsWithSet(`artist:"*${fuzzy}*"`);
  }

  async getCardsByDexRange(min: number, max: number): Promise<CardWithSet[]> {
    return this.pagedCardsWithSet(`nationalPokedexNumbers:[${min} TO ${max}]`);
  }

  private async pagedCardsWithSet(query: string): Promise<CardWithSet[]> {
    const cards: CardWithSet[] = [];
    let page = 1;
    for (;;) {
      const body = await this.request(
        `/cards?q=${encodeURIComponent(query)}&pageSize=${PAGE_SIZE}&page=${page}&orderBy=set.releaseDate,number`,
      );
      const data = (body.data ?? []) as ApiCard[];
      cards.push(...data.map(mapCardWithSet));
      const total = typeof body.totalCount === "number" ? body.totalCount : cards.length;
      if (cards.length >= total || data.length === 0) return cards;
      page += 1;
    }
  }

  private async request(path: string): Promise<{ data?: unknown; totalCount?: number }> {
    let lastError: TcgError = new TcgError("network", "request never attempted");
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      if (attempt > 0) {
        const delay = this.backoffMs[Math.min(attempt - 1, this.backoffMs.length - 1)] ?? 1_000;
        await sleep(delay);
      }
      try {
        return await this.attempt(path);
      } catch (err) {
        lastError = err instanceof TcgError ? err : new TcgError("network", String(err));
        // 4xx (other than 429) won't improve with retries.
        if (lastError.kind === "http" && lastError.status && lastError.status < 500 && lastError.status !== 429) {
          throw lastError;
        }
      }
    }
    throw lastError;
  }

  private async attempt(path: string): Promise<{ data?: unknown; totalCount?: number }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers = new Headers({ Accept: "application/json" });
      const key = process.env.POKEMONTCG_API_KEY;
      if (key) headers.set("X-Api-Key", key);

      let res: Response;
      try {
        res = await fetch(`${BASE}${path}`, { headers, signal: controller.signal });
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          throw new TcgError("timeout", `pokemontcg.io timed out after ${this.timeoutMs}ms`);
        }
        throw new TcgError("network", `pokemontcg.io unreachable: ${String(err)}`);
      }

      if (!res.ok) {
        throw new TcgError("http", `pokemontcg.io responded ${res.status}`, res.status);
      }
      try {
        return (await res.json()) as { data?: unknown; totalCount?: number };
      } catch {
        throw new TcgError("parse", "pokemontcg.io returned non-JSON payload");
      }
    } finally {
      clearTimeout(timer);
    }
  }
}

function mapSet(s: ApiSet): TcgSet {
  return {
    id: s.id,
    name: s.name,
    series: s.series,
    printedTotal: s.printedTotal,
    total: s.total,
    releaseDate: s.releaseDate,
    symbolUrl: s.images?.symbol ?? "",
    logoUrl: s.images?.logo ?? "",
  };
}

function mapCard(c: ApiCard): TcgCard {
  return {
    id: c.id,
    name: c.name,
    number: c.number,
    rarity: c.rarity,
    supertype: c.supertype ?? "Unknown",
    imageSmall: c.images?.small ?? "",
    imageLarge: c.images?.large ?? "",
    variants: deriveVariants(c.tcgplayer?.prices, {
      releaseDate: c.set.releaseDate,
      printedTotal: c.set.printedTotal,
      number: c.number,
      rarity: c.rarity,
    }),
    dex: c.nationalPokedexNumbers,
    artist: c.artist,
    tcgplayer: mapTcgPlayer(c.tcgplayer),
  };
}

function mapCardWithSet(c: ApiCard): CardWithSet {
  return {
    ...mapCard(c),
    setId: c.set.id,
    setName: c.set.name,
    setReleaseDate: c.set.releaseDate,
    setPrintedTotal: c.set.printedTotal,
    secret: isSecretNumber(c.number, c.set.printedTotal),
  };
}

const PRICE_FIELDS = ["low", "mid", "high", "market", "directLow"] as const;

/** Trims TCGplayer data to the numbers the detail view shows. */
function mapTcgPlayer(raw: ApiCard["tcgplayer"]): TcgPlayerInfo | undefined {
  if (!raw) return undefined;
  const prices: Record<string, PriceRange> = {};
  for (const [variant, fields] of Object.entries(raw.prices ?? {})) {
    const range: PriceRange = {};
    for (const field of PRICE_FIELDS) {
      const value = fields?.[field];
      if (typeof value === "number") range[field] = value;
    }
    prices[variant] = range;
  }
  return {
    url: raw.url,
    updatedAt: raw.updatedAt,
    prices: Object.keys(prices).length > 0 ? prices : undefined,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
