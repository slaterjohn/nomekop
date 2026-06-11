import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PokemonTcgIoSource } from "@/lib/tcg/pokemontcgio";
import { FixtureSource } from "@/lib/tcg/fixture-source";
import { TcgError } from "@/lib/tcg/types";

const SET_JSON = {
  id: "sv1",
  name: "Scarlet & Violet",
  series: "Scarlet & Violet",
  printedTotal: 198,
  total: 258,
  releaseDate: "2023/03/31",
  images: { symbol: "https://images.pokemontcg.io/sv1/symbol.png", logo: "https://images.pokemontcg.io/sv1/logo.png" },
};

const CARD_JSON = {
  id: "sv1-1",
  name: "Pineco",
  number: "1",
  rarity: "Common",
  supertype: "Pokémon",
  images: { small: "https://images.pokemontcg.io/sv1/1.png", large: "https://images.pokemontcg.io/sv1/1_hires.png" },
  set: SET_JSON,
  tcgplayer: { prices: { normal: {}, reverseHolofoil: {} } },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PokemonTcgIoSource.getSets", () => {
  it("maps API sets to TcgSet", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ data: [SET_JSON], totalCount: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const source = new PokemonTcgIoSource({ retries: 0 });
    const sets = await source.getSets();
    expect(sets).toEqual([
      {
        id: "sv1",
        name: "Scarlet & Violet",
        series: "Scarlet & Violet",
        printedTotal: 198,
        total: 258,
        releaseDate: "2023/03/31",
        symbolUrl: "https://images.pokemontcg.io/sv1/symbol.png",
        logoUrl: "https://images.pokemontcg.io/sv1/logo.png",
      },
    ]);
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/v2/sets");
  });

  it("sends X-Api-Key when configured", async () => {
    vi.stubEnv("POKEMONTCG_API_KEY", "secret-key");
    const fetchMock = vi.fn(async (_url: unknown, _init?: RequestInit) =>
      jsonResponse({ data: [], totalCount: 0 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await new PokemonTcgIoSource({ retries: 0 }).getSets();
    const init = fetchMock.mock.calls[0]![1];
    expect(new Headers(init?.headers).get("X-Api-Key")).toBe("secret-key");
  });

  it("retries on 500 then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "boom" }, 500))
      .mockResolvedValueOnce(jsonResponse({ data: [SET_JSON], totalCount: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const source = new PokemonTcgIoSource({ retries: 1, backoffMs: [0] });
    const sets = await source.getSets();
    expect(sets).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("maps persistent HTTP failure to TcgError http", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ error: "boom" }, 503));
    vi.stubGlobal("fetch", fetchMock);
    const source = new PokemonTcgIoSource({ retries: 1, backoffMs: [0] });
    await expect(source.getSets()).rejects.toMatchObject({ kind: "http", status: 503 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("maps network failure to TcgError network", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    vi.stubGlobal("fetch", fetchMock);
    const source = new PokemonTcgIoSource({ retries: 0 });
    await expect(source.getSets()).rejects.toMatchObject({ kind: "network" });
  });

  it("maps abort to TcgError timeout", async () => {
    const fetchMock = vi.fn(async (_url: unknown, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
        );
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const source = new PokemonTcgIoSource({ retries: 0, timeoutMs: 20 });
    await expect(source.getSets()).rejects.toMatchObject({ kind: "timeout" });
  });

  it("maps invalid JSON to TcgError parse", async () => {
    const fetchMock = vi.fn(
      async () => new Response("<html>gateway</html>", { status: 200, headers: { "content-type": "text/html" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const source = new PokemonTcgIoSource({ retries: 0 });
    await expect(source.getSets()).rejects.toMatchObject({ kind: "parse" });
  });
});

describe("PokemonTcgIoSource.getCards", () => {
  it("paginates past 250 and concatenates, mapping variants", async () => {
    const page1 = Array.from({ length: 250 }, (_, i) => ({
      ...CARD_JSON,
      id: `sv1-${i + 1}`,
      number: String(i + 1),
    }));
    const page2 = Array.from({ length: 8 }, (_, i) => ({
      ...CARD_JSON,
      id: `sv1-${251 + i}`,
      number: String(251 + i),
      rarity: "Special Illustration Rare",
      tcgplayer: undefined,
    }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: page1, totalCount: 258 }))
      .mockResolvedValueOnce(jsonResponse({ data: page2, totalCount: 258 }));
    vi.stubGlobal("fetch", fetchMock);

    const source = new PokemonTcgIoSource({ retries: 0 });
    const cards = await source.getCards("sv1");
    expect(cards).toHaveLength(258);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]![0])).toContain("set.id%3Asv1");
    expect(cards[0]).toMatchObject({
      id: "sv1-1",
      variants: { normal: true, reverse: true, holo: false },
    });
    // page-2 secret rare fell back to the heuristic: no reverse
    expect(cards[257]).toMatchObject({ variants: { normal: true, reverse: false } });
  });
});

describe("FixtureSource", () => {
  it("serves the committed sets", async () => {
    const source = new FixtureSource();
    const sets = await source.getSets();
    expect(sets.length).toBeGreaterThan(50);
    expect(sets.some((s) => s.id === "base1")).toBe(true);
    expect(sets.some((s) => s.id === "sv1")).toBe(true);
  });

  it("serves base1 cards (102) and sv1 cards (258)", async () => {
    const source = new FixtureSource();
    expect(await source.getCards("base1")).toHaveLength(102);
    expect(await source.getCards("sv1")).toHaveLength(258);
  });

  it("throws unknown-set for sets without fixture data", async () => {
    const source = new FixtureSource();
    await expect(source.getCards("nope")).rejects.toMatchObject({
      kind: "unknown-set",
    } satisfies Partial<TcgError>);
  });
});
