// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { SqliteStore } from "@/lib/server-store";

let dir: string;
let stores: SqliteStore[] = [];

function open(file = "test.db"): SqliteStore {
  const store = new SqliteStore(path.join(dir, file));
  stores.push(store);
  return store;
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "bindermon-db-"));
});

afterEach(async () => {
  vi.useRealTimers();
  for (const s of stores) s.close();
  stores = [];
  await rm(dir, { recursive: true, force: true });
});

const TTL = 60_000;

function fakeClock() {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-06-12T12:00:00Z"));
}

describe("SqliteStore", () => {
  it("computes once and serves from the database afterwards", async () => {
    const store = open();
    const compute = vi.fn(async () => ({ cards: [1, 2, 3] }));
    expect(await store.getOrCompute("k", TTL, compute)).toEqual({ cards: [1, 2, 3] });
    expect(await store.getOrCompute("k", TTL, compute)).toEqual({ cards: [1, 2, 3] });
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("persists across instances (server restarts)", async () => {
    const a = open("shared.db");
    const compute = vi.fn(async () => "value");
    await a.getOrCompute("k", TTL, compute);
    a.close();

    const b = open("shared.db");
    expect(await b.getOrCompute("k", TTL, compute)).toBe("value");
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("serves stale immediately and refreshes in the background (SWR)", async () => {
    fakeClock();
    const store = open();
    let version = 1;
    const compute = vi.fn(async () => `v${version}`);
    await store.getOrCompute("k", TTL, compute);

    vi.advanceTimersByTime(TTL + 1);
    version = 2;
    expect(await store.getOrCompute("k", TTL, compute)).toBe("v1");
    await store.flush();
    expect(compute).toHaveBeenCalledTimes(2);
    expect(await store.getOrCompute("k", TTL, compute)).toBe("v2");
  });

  it("coalesces concurrent misses into one compute", async () => {
    const store = open();
    let release!: () => void;
    const compute = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          release = () => resolve("once");
        }),
    );
    const pa = store.getOrCompute("k", TTL, compute);
    const pb = store.getOrCompute("k", TTL, compute);
    await new Promise((r) => setTimeout(r, 10));
    release();
    expect(await Promise.all([pa, pb])).toEqual(["once", "once"]);
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("returns stale value when a refresh fails", async () => {
    fakeClock();
    const store = open();
    let fail = false;
    const compute = vi.fn(async () => {
      if (fail) throw new Error("api down");
      return "v1";
    });
    await store.getOrCompute("k", TTL, compute);
    vi.advanceTimersByTime(TTL + 1);
    fail = true;
    expect(await store.getOrCompute("k", TTL, compute)).toBe("v1");
    await store.flush();
    expect(await store.getOrCompute("k", TTL, compute)).toBe("v1");
  });

  it("rejects when compute fails with nothing cached", async () => {
    const store = open();
    await expect(
      store.getOrCompute("k", TTL, async () => {
        throw new Error("api down");
      }),
    ).rejects.toThrow("api down");
    expect(await store.getOrCompute("k", TTL, async () => "recovered")).toBe("recovered");
  });

  it("set() force-overwrites regardless of freshness (daily refresher)", async () => {
    const store = open();
    const compute = vi.fn(async () => "original");
    await store.getOrCompute("k", TTL, compute);
    store.set("k", "refreshed", TTL);
    expect(await store.getOrCompute("k", TTL, compute)).toBe("refreshed");
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("per-key TTLs are independent", async () => {
    fakeClock();
    const store = open();
    await store.getOrCompute("short", 1_000, async () => "s1");
    await store.getOrCompute("long", 100_000, async () => "l1");
    vi.advanceTimersByTime(5_000);
    // short is stale (SWR fires), long is still fresh
    const sCompute = vi.fn(async () => "s2");
    const lCompute = vi.fn(async () => "l2");
    await store.getOrCompute("short", 1_000, sCompute);
    await store.getOrCompute("long", 100_000, lCompute);
    await store.flush();
    expect(sCompute).toHaveBeenCalledTimes(1);
    expect(lCompute).not.toHaveBeenCalled();
  });

  it("survives an unwritable directory (degrades to memory)", async () => {
    const store = new SqliteStore("/dev/null/nope/bindermon.db");
    stores.push(store);
    expect(await store.getOrCompute("k", TTL, async () => "still works")).toBe("still works");
  });
});
