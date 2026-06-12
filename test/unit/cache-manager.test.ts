// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";
import { runCacheCheck, readManifest, FULL_REFRESH_AGE_MS } from "@/lib/tcg/cache-manager";
import { SqliteStore } from "@/lib/server-store";
import { TcgError, type CardDataSource, type TcgCard, type TcgSet } from "@/lib/tcg/types";

const DAY = 24 * 60 * 60 * 1000;
const T0 = 1_700_000_000_000;

const mkSet = (id: string): TcgSet => ({
  id,
  name: id.toUpperCase(),
  series: "Test",
  printedTotal: 2,
  total: 2,
  releaseDate: "2024/01/01",
  symbolUrl: "",
  logoUrl: "",
});

const mkCard = (setId: string, n: number): TcgCard => ({
  id: `${setId}-${n}`,
  name: `Card ${n}`,
  number: String(n),
  rarity: "Common",
  supertype: "Pokémon",
  imageSmall: "",
  imageLarge: "",
  variants: { normal: true, reverse: false, holo: false },
});

/** A controllable source: configurable set list + optional per-set behaviour. */
function source(
  setIds: string[],
  behaviour: (setId: string, callIndex: number) => void = () => {},
): CardDataSource & { calls: Record<string, number> } {
  const calls: Record<string, number> = {};
  return {
    calls,
    async getSets() {
      return setIds.map(mkSet);
    },
    async getCards(setId: string) {
      calls[setId] = (calls[setId] ?? 0) + 1;
      behaviour(setId, calls[setId]);
      return [mkCard(setId, 1), mkCard(setId, 2)];
    },
    async searchCardsByName() {
      return [];
    },
    async searchCardsByArtist() {
      return [];
    },
    async getCardsByDexRange() {
      return [];
    },
  };
}

const base = { paceMs: 0, backoff: () => 0 } as const;

let store: SqliteStore;
afterEach(() => store?.close());

describe("runCacheCheck", () => {
  it("full build when nothing is cached", async () => {
    store = new SqliteStore(":memory:");
    const src = source(["aaa", "bbb"]);
    const s = await runCacheCheck({ ...base, store, source: src, now: T0 });

    expect(s.action).toBe("full");
    expect(s.fetched).toBe(2);
    expect(store.peek("cards:aaa")).toHaveLength(2);
    expect(store.peek("cards:bbb")).toHaveLength(2);
    expect(readManifest(store)).toMatchObject({ knownSetIds: ["aaa", "bbb"], builtAt: T0 });
  });

  it("does nothing when data exists and no new sets (within 14 days)", async () => {
    store = new SqliteStore(":memory:");
    const src = source(["aaa", "bbb"]);
    await runCacheCheck({ ...base, store, source: src, now: T0 });

    const s = await runCacheCheck({ ...base, store, source: src, now: T0 + 5 * DAY });
    expect(s.action).toBe("noop");
    expect(s.fetched).toBe(0);
    // No set was re-fetched.
    expect(src.calls).toEqual({ aaa: 1, bbb: 1 });
  });

  it("fetches only the new set when a release appears", async () => {
    store = new SqliteStore(":memory:");
    await runCacheCheck({ ...base, store, source: source(["aaa", "bbb"]), now: T0 });

    const src2 = source(["aaa", "bbb", "ccc"]);
    const s = await runCacheCheck({ ...base, store, source: src2, now: T0 + 2 * DAY });

    expect(s.action).toBe("incremental");
    expect(s.fetched).toBe(1);
    expect(src2.calls).toEqual({ ccc: 1 }); // only the new set fetched
    expect(store.peek("cards:ccc")).toHaveLength(2);
    expect(readManifest(store)!.knownSetIds).toEqual(["aaa", "bbb", "ccc"]);
    // builtAt is unchanged by an incremental update.
    expect(readManifest(store)!.builtAt).toBe(T0);
  });

  it("refreshes everything once the cache is ≥14 days old", async () => {
    store = new SqliteStore(":memory:");
    await runCacheCheck({ ...base, store, source: source(["aaa", "bbb"]), now: T0 });

    const src = source(["aaa", "bbb"]);
    const s = await runCacheCheck({ ...base, store, source: src, now: T0 + FULL_REFRESH_AGE_MS });

    expect(s.action).toBe("full");
    expect(s.fetched).toBe(2);
    expect(src.calls).toEqual({ aaa: 1, bbb: 1 }); // both re-fetched
    expect(readManifest(store)!.builtAt).toBe(T0 + FULL_REFRESH_AGE_MS);
  });

  it("retries a rate-limited set in place, then continues", async () => {
    store = new SqliteStore(":memory:");
    // 'bbb' is rate-limited on its first attempt, succeeds on the second.
    const src = source(["aaa", "bbb", "ccc"], (id, n) => {
      if (id === "bbb" && n === 1) throw new TcgError("http", "429", 429);
    });
    const s = await runCacheCheck({ ...base, store, source: src, now: T0, maxRateLimitRetries: 5 });

    expect(s.action).toBe("full");
    expect(s.rateLimited).toBe(false);
    expect(s.fetched).toBe(3);
    expect(src.calls.bbb).toBe(2); // retried in place
    expect(store.peek("cards:ccc")).toHaveLength(2);
  });

  it("stops on sustained rate limiting and resumes where it left off", async () => {
    store = new SqliteStore(":memory:");
    let bbbBlocked = true;
    const src = source(["aaa", "bbb", "ccc"], (id) => {
      if (id === "bbb" && bbbBlocked) throw new TcgError("http", "429", 429);
    });
    // No retries → first 429 stops the run.
    const first = await runCacheCheck({
      ...base,
      store,
      source: src,
      now: T0,
      maxRateLimitRetries: 0,
    });

    expect(first.action).toBe("rate-limited");
    expect(first.rateLimited).toBe(true);
    expect(store.peek("cards:aaa")).toHaveLength(2);
    expect(store.peek("cards:bbb")).toBeUndefined();
    expect(store.peek("cards:ccc")).toBeUndefined(); // never reached
    expect(readManifest(store)).toBeUndefined(); // build not finalised

    // The block clears; the next run resumes from 'bbb', not from the start.
    bbbBlocked = false;
    const second = await runCacheCheck({ ...base, store, source: src, now: T0 + DAY });

    expect(second.action).toBe("resumed");
    expect(src.calls.aaa).toBe(1); // 'aaa' was NOT re-fetched
    expect(store.peek("cards:bbb")).toHaveLength(2);
    expect(store.peek("cards:ccc")).toHaveLength(2);
    expect(readManifest(store)).toMatchObject({ knownSetIds: ["aaa", "bbb", "ccc"] });
  });
});
