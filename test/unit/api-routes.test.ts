// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as getSets } from "@/app/api/sets/route";
import { GET as getCards } from "@/app/api/cards/[setId]/route";
import { GET as getImg } from "@/app/api/img/route";
import { GET as getPokedexPrints } from "@/app/api/pokedex/prints/route";

beforeEach(() => {
  vi.stubEnv("TCG_DATA_SOURCE", "fixture");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/sets", () => {
  it("returns the sets list as JSON", async () => {
    const res = await getSets();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ id: string; name: string; series: string }>;
    expect(body.length).toBeGreaterThan(50);
    expect(body[0]).toHaveProperty("id");
    expect(body[0]).toHaveProperty("name");
    expect(body[0]).toHaveProperty("series");
    expect(res.headers.get("Cache-Control")).toContain("stale-while-revalidate");
  });
});

describe("GET /api/cards/[setId]", () => {
  it("returns 102 cards for base1", async () => {
    const res = await getCards(new Request("http://test/api/cards/base1"), {
      params: Promise.resolve({ setId: "base1" }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()) as unknown[]).toHaveLength(102);
  });

  it("404s with friendly error for unknown sets (fixture mode)", async () => {
    const res = await getCards(new Request("http://test/api/cards/nope"), {
      params: Promise.resolve({ setId: "nope" }),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("nope");
  });

  it("400s on malformed set ids", async () => {
    const res = await getCards(new Request("http://test/api/cards/..%2Fetc"), {
      params: Promise.resolve({ setId: "../etc" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/img", () => {
  it("rejects missing src", async () => {
    const res = await getImg(new NextRequest("http://test/api/img"));
    expect(res.status).toBe(400);
  });

  it("rejects non-allowlisted hosts", async () => {
    const res = await getImg(
      new NextRequest("http://test/api/img?src=" + encodeURIComponent("https://evil.example/x.png")),
    );
    expect(res.status).toBe(400);
  });

  it("allows both card-image CDNs (pokemontcg.io and scrydex)", async () => {
    // Sets released 2026+ moved to images.scrydex.com — regression guard.
    vi.stubEnv("IMG_STUB", "1");
    for (const src of [
      "https://images.pokemontcg.io/base1/4.png",
      "https://images.scrydex.com/pokemon/me4-1/small",
    ]) {
      const res = await getImg(new NextRequest("http://test/api/img?src=" + encodeURIComponent(src)));
      expect(res.status, src).toBe(200);
    }
  });

  it("rejects non-https and invalid URLs", async () => {
    const bad = await getImg(
      new NextRequest("http://test/api/img?src=" + encodeURIComponent("http://images.pokemontcg.io/x.png")),
    );
    expect(bad.status).toBe(400);
    const invalid = await getImg(new NextRequest("http://test/api/img?src=not-a-url"));
    expect(invalid.status).toBe(400);
  });

  it("IMG_STUB=1 serves the stub PNG without network", async () => {
    vi.stubEnv("IMG_STUB", "1");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await getImg(
      new NextRequest(
        "http://test/api/img?src=" + encodeURIComponent("https://images.pokemontcg.io/base1/4.png"),
      ),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    const bytes = new Uint8Array(await res.arrayBuffer());
    // PNG magic
    expect([...bytes.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe("GET /api/pokedex/prints", () => {
  const call = (qs: string) =>
    getPokedexPrints(new NextRequest(`http://test/api/pokedex/prints${qs}`));

  it("400s on a missing or out-of-range dex number", async () => {
    expect((await call("")).status).toBe(400);
    expect((await call("?dex=0&langs=ja")).status).toBe(400);
    expect((await call("?dex=9999&langs=ja")).status).toBe(400);
    expect((await call("?dex=abc&langs=ja")).status).toBe(400);
  });

  it("returns an empty list when no non-English languages are requested", async () => {
    for (const qs of ["?dex=6", "?dex=6&langs=en", "?dex=6&langs=", "?dex=6&langs=zz"]) {
      const res = await call(qs);
      expect(res.status, qs).toBe(200);
      expect((await res.json()) as { cards: unknown[] }).toEqual({ cards: [] });
    }
  });

  it("answers a valid request with a cacheable, JSON card list (empty offline)", async () => {
    // Fixture mode skips TCGdex, so this stays hermetic — shape + headers only.
    const res = await call("?dex=6&langs=ja,fr");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("stale-while-revalidate");
    expect((await res.json()) as { cards: unknown[] }).toEqual({ cards: [] });
  });
});
