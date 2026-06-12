// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { runRefreshAll, isRefreshRunning } from "@/lib/tcg/refresh";
import { SqliteStore } from "@/lib/server-store";
import type { CardDataSource, TcgCard, TcgSet } from "@/lib/tcg/types";

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

function sourceWith(sets: string[], failing: string[] = []): CardDataSource {
  return {
    async getSets() {
      return sets.map(mkSet);
    },
    async getCards(setId: string) {
      if (failing.includes(setId)) throw new Error(`boom ${setId}`);
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

let store: SqliteStore;

afterEach(() => {
  store?.close();
});

describe("runRefreshAll", () => {
  it("stores the sets list and every set's cards", async () => {
    store = new SqliteStore(":memory:");
    const summary = await runRefreshAll({
      source: sourceWith(["aaa", "bbb"]),
      store,
      paceMs: 0,
    });
    expect(summary).toMatchObject({ sets: 2, ok: 2, failed: [], pokedexOk: 9, pokemonOk: 20, illustratorOk: 6 });
    // Stored entries are served without recomputing.
    const compute = vi.fn(async () => []);
    expect(await store.getOrCompute("sets", 1000, compute)).toHaveLength(2);
    expect(await store.getOrCompute("cards:aaa", 1000, compute)).toHaveLength(2);
    expect(compute).not.toHaveBeenCalled();
  });

  it("keeps going when individual sets fail and reports them", async () => {
    store = new SqliteStore(":memory:");
    const summary = await runRefreshAll({
      source: sourceWith(["aaa", "bad", "ccc"], ["bad"]),
      store,
      paceMs: 0,
    });
    expect(summary.ok).toBe(2);
    expect(summary.failed).toEqual(["bad"]);
  });

  it("refuses concurrent runs", async () => {
    store = new SqliteStore(":memory:");
    let release!: () => void;
    const slowSource: CardDataSource = {
      getSets: () =>
        new Promise((resolve) => {
          release = () => resolve([mkSet("aaa")]);
        }),
      getCards: async () => [],
      searchCardsByName: async () => [],
      searchCardsByArtist: async () => [],
      getCardsByDexRange: async () => [],
    };
    const first = runRefreshAll({ source: slowSource, store, paceMs: 0 });
    expect(isRefreshRunning()).toBe(true);
    await expect(runRefreshAll({ source: slowSource, store, paceMs: 0 })).rejects.toThrow(
      /already running/i,
    );
    release();
    await first;
    expect(isRefreshRunning()).toBe(false);
  });
});
