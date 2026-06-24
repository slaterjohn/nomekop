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
    return this.collectDistinct<ApiSet, TcgSet>(
      (page) => `/sets?pageSize=${PAGE_SIZE}&page=${page}&orderBy=releaseDate`,
      mapSet,
      "sets",
    );
  }

  async getCards(setId: string): Promise<TcgCard[]> {
    const q = encodeURIComponent(`set.id:${setId}`);
    // orderBy=id, not =number: pokemontcg.io string-sorts the `number` field, so
    // paging a set whose collector numbers don't sort lexicographically (e.g.
    // Ascended Heroes) returns overlapping pages — duplicates plus dropped tail
    // cards. A unique, stable key (id) paginates cleanly. The app re-sorts cards
    // for display anyway, so API order is immaterial.
    // Returns RAW cards (intact reverse pool). Ball/Energy patterns are applied
    // at READ time in lib/tcg getCards, not baked here — see applyBallPatterns.
    return this.collectDistinct<ApiCard, TcgCard>(
      (page) => `/cards?q=${q}&pageSize=${PAGE_SIZE}&page=${page}&orderBy=id`,
      mapCard,
      `cards for set ${setId}`,
    );
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
    // orderBy=id for stable pagination (see getCards) — `number` string-sorts and
    // can desync multi-page results. Cross-set results are sorted for display
    // downstream, so the API ordering here doesn't matter.
    return this.collectDistinct<ApiCard, CardWithSet>(
      (page) =>
        `/cards?q=${encodeURIComponent(query)}&pageSize=${PAGE_SIZE}&page=${page}&orderBy=id`,
      mapCardWithSet,
      `cards for query ${query}`,
    );
  }

  /**
   * Pages through a list endpoint, deduping by id and assembling DISTINCT items.
   *
   * Two safeguards against the silent data loss that bit Ascended Heroes (a set
   * whose snapshot shifted mid-pagination, so page 2 re-served page-1 cards):
   *
   *  1. Termination is by distinct count, not array length — duplicate rows can
   *     no longer push `length` past `totalCount` and trick the loop into
   *     stopping before the real tail loads. A page that adds zero new ids ends
   *     the loop (so an endlessly-duplicating endpoint can't spin forever).
   *  2. Completeness check — if the API reported a `totalCount` we never reached
   *     with distinct items, we THROW rather than return a short list. Callers
   *     cache via getOrCompute, which only persists on success, so a truncated
   *     fetch is dropped (and the prior good cache kept) instead of poisoning it.
   */
  private async collectDistinct<A extends { id: string }, T>(
    pathFor: (page: number) => string,
    map: (item: A) => T,
    label: string,
  ): Promise<T[]> {
    const byId = new Map<string, T>();
    let knownTotal: number | undefined;
    let page = 1;
    for (;;) {
      const body = await this.request(pathFor(page));
      const data = (body.data ?? []) as A[];
      if (typeof body.totalCount === "number") knownTotal = body.totalCount;
      const before = byId.size;
      for (const item of data) byId.set(item.id, map(item));
      const target = knownTotal ?? byId.size;
      if (byId.size >= target) break;
      // Out of rows, or a page that contributed nothing new — stop and let the
      // completeness check below decide whether what we have is acceptable.
      if (data.length === 0 || byId.size === before) break;
      page += 1;
    }
    if (knownTotal !== undefined && byId.size < knownTotal) {
      throw new TcgError(
        "incomplete",
        `pokemontcg.io returned an incomplete list for ${label}: ${byId.size} distinct of ${knownTotal} reported`,
      );
    }
    return [...byId.values()];
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

/**
 * pokemontcg.io returns the Mega Evolution attack-rare rarity as a raw enum
 * (`MEGA_ATTACK_RARE`) while every other rarity is Title Case. Normalize it so it
 * reads cleanly everywhere (binder, card detail, FAQs) and matches the rarity
 * rank table. Currently the only known offender.
 */
function normalizeRarity(rarity: string | undefined): string | undefined {
  return rarity === "MEGA_ATTACK_RARE" ? "Mega Attack Rare" : rarity;
}

function mapCard(c: ApiCard): TcgCard {
  const rarity = normalizeRarity(c.rarity);
  return {
    id: c.id,
    name: c.name,
    number: c.number,
    rarity,
    supertype: c.supertype ?? "Unknown",
    imageSmall: c.images?.small ?? "",
    imageLarge: c.images?.large ?? "",
    variants: deriveVariants(c.tcgplayer?.prices, {
      releaseDate: c.set.releaseDate,
      printedTotal: c.set.printedTotal,
      number: c.number,
      rarity,
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
