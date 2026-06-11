import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { LayeredCache } from "@/lib/cache";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "bindermon-cache-"));
});

afterEach(async () => {
  vi.useRealTimers();
  await rm(dir, { recursive: true, force: true });
});

const TTL = 60_000;

/** Fake only the clock (Date.now) — real fs and promises keep flowing. */
function fakeClock() {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-06-11T12:00:00Z"));
}

describe("LayeredCache", () => {
  it("computes once and serves from memory afterwards", async () => {
    const cache = new LayeredCache(dir);
    const compute = vi.fn(async () => "value");
    expect(await cache.getOrCompute("k", TTL, compute)).toBe("value");
    expect(await cache.getOrCompute("k", TTL, compute)).toBe("value");
    expect(compute).toHaveBeenCalledTimes(1);
    await cache.flush();
  });

  it("persists to disk: a fresh instance reads without recomputing", async () => {
    const a = new LayeredCache(dir);
    const compute = vi.fn(async () => ({ deep: [1, 2, 3] }));
    await a.getOrCompute("k", TTL, compute);
    await a.flush();

    const b = new LayeredCache(dir);
    const result = await b.getOrCompute("k", TTL, compute);
    expect(result).toEqual({ deep: [1, 2, 3] });
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("serves stale immediately and refreshes in the background (SWR)", async () => {
    fakeClock();
    const cache = new LayeredCache(dir);
    let version = 1;
    const compute = vi.fn(async () => `v${version}`);
    await cache.getOrCompute("k", TTL, compute);

    vi.advanceTimersByTime(TTL + 1);
    version = 2;
    // Stale hit: returns old value instantly…
    expect(await cache.getOrCompute("k", TTL, compute)).toBe("v1");
    // …but kicked off a background refresh.
    await cache.flush();
    expect(compute).toHaveBeenCalledTimes(2);
    expect(await cache.getOrCompute("k", TTL, compute)).toBe("v2");
  });

  it("coalesces concurrent misses into one compute", async () => {
    const cache = new LayeredCache(dir);
    let release!: () => void;
    const compute = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          release = () => resolve("once");
        }),
    );
    const pa = cache.getOrCompute("k", TTL, compute);
    const pb = cache.getOrCompute("k", TTL, compute);
    // Let both calls pass the disk-miss check and reach the inflight map.
    await new Promise((r) => setTimeout(r, 25));
    release();
    expect(await Promise.all([pa, pb])).toEqual(["once", "once"]);
    expect(compute).toHaveBeenCalledTimes(1);
    // A third call now hits the fresh value.
    expect(await cache.getOrCompute("k", TTL, compute)).toBe("once");
    expect(compute).toHaveBeenCalledTimes(1);
    await cache.flush();
  });

  it("evicts least-recently-used entries beyond maxMem", async () => {
    const cache = new LayeredCache(dir, 2);
    const mk = (v: string) => vi.fn(async () => v);
    const c1 = mk("one");
    await cache.getOrCompute("k1", TTL, c1);
    await cache.getOrCompute("k2", TTL, mk("two"));
    await cache.getOrCompute("k1", TTL, c1); // touch k1 → k2 is now LRU
    await cache.getOrCompute("k3", TTL, mk("three")); // evicts k2 from memory
    expect(cache.memorySize()).toBe(2);
    expect(c1).toHaveBeenCalledTimes(1);
    await cache.flush();
  });

  it("quarantines corrupted disk entries and recomputes", async () => {
    const cache = new LayeredCache(dir);
    const compute = vi.fn(async () => "good");
    await cache.getOrCompute("k", TTL, compute);
    await cache.flush();

    const files = await readdir(dir);
    expect(files.length).toBe(1);
    await writeFile(path.join(dir, files[0]!), "{not json", "utf8");

    const fresh = new LayeredCache(dir);
    expect(await fresh.getOrCompute("k", TTL, compute)).toBe("good");
    expect(compute).toHaveBeenCalledTimes(2);
    // corrupted file replaced by the recomputed value
    await fresh.flush();
    const after = await readFile(path.join(dir, files[0]!), "utf8");
    expect(() => JSON.parse(after)).not.toThrow();
  });

  it("returns stale value when refresh fails", async () => {
    fakeClock();
    const cache = new LayeredCache(dir);
    let fail = false;
    const compute = vi.fn(async () => {
      if (fail) throw new Error("api down");
      return "v1";
    });
    await cache.getOrCompute("k", TTL, compute);
    vi.advanceTimersByTime(TTL + 1);
    fail = true;
    expect(await cache.getOrCompute("k", TTL, compute)).toBe("v1");
    await cache.flush();
    // still serves stale after failed refresh
    expect(await cache.getOrCompute("k", TTL, compute)).toBe("v1");
  });

  it("rejects when compute fails with no cached value", async () => {
    const cache = new LayeredCache(dir);
    const compute = vi.fn(async () => {
      throw new Error("api down");
    });
    await expect(cache.getOrCompute("k", TTL, compute)).rejects.toThrow("api down");
    // a later attempt retries (failure was not cached)
    const ok = vi.fn(async () => "recovered");
    expect(await cache.getOrCompute("k", TTL, ok)).toBe("recovered");
    await cache.flush();
  });

  it("survives a broken cache directory (degrades to compute)", async () => {
    const cache = new LayeredCache("/dev/null/not-a-dir");
    const compute = vi.fn(async () => "still works");
    expect(await cache.getOrCompute("k", TTL, compute)).toBe("still works");
    await cache.flush();
  });
});
