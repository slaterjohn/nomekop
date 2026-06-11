import { createHash } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export interface CacheStore {
  getOrCompute<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T>;
}

type Entry = { value: unknown; expiresAt: number };

/**
 * Two-layer TTL cache: in-memory LRU over JSON files on disk, with
 * stale-while-revalidate semantics and in-flight coalescing.
 *
 * - Fresh hit (memory or disk): returned directly.
 * - Stale hit: returned immediately; one background refresh fires.
 * - Miss: compute is awaited; concurrent callers share the same promise.
 * - All disk failures are non-fatal — the cache degrades, never breaks.
 */
export class LayeredCache implements CacheStore {
  private mem = new Map<string, Entry>(); // Map order doubles as LRU order
  private inflight = new Map<string, Promise<unknown>>();
  private pendingWrites = new Set<Promise<void>>();

  constructor(
    private dir: string,
    private maxMem = 50,
  ) {}

  /** Awaits background refreshes and disk writes (tests, graceful shutdown). */
  async flush(): Promise<void> {
    while (this.inflight.size > 0 || this.pendingWrites.size > 0) {
      await Promise.allSettled([...this.inflight.values(), ...this.pendingWrites]);
    }
  }

  async getOrCompute<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const entry = this.mem.get(key) ?? (await this.readDisk(key));

    if (entry) {
      this.touch(key, entry);
      if (entry.expiresAt > now) {
        return entry.value as T;
      }
      // Stale: serve immediately, refresh in the background. Swallow refresh
      // errors — the stale value remains the best answer we have.
      void this.refresh(key, ttlMs, compute).catch(() => {});
      return entry.value as T;
    }

    return this.refresh(key, ttlMs, compute);
  }

  /** Test/diagnostics: number of entries held in memory. */
  memorySize(): number {
    return this.mem.size;
  }

  private refresh<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(key);
    if (existing) return existing as Promise<T>;

    const p = (async () => {
      try {
        const value = await compute();
        const entry: Entry = { value, expiresAt: Date.now() + ttlMs };
        this.touch(key, entry);
        const write = this.writeDisk(key, entry).catch(() => {});
        this.pendingWrites.add(write);
        void write.finally(() => this.pendingWrites.delete(write));
        return value;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, p);
    return p;
  }

  private touch(key: string, entry: Entry): void {
    this.mem.delete(key);
    this.mem.set(key, entry);
    while (this.mem.size > this.maxMem) {
      const oldest = this.mem.keys().next().value;
      if (oldest === undefined) break;
      this.mem.delete(oldest);
    }
  }

  private file(key: string): string {
    return path.join(this.dir, `${createHash("sha1").update(key).digest("hex")}.json`);
  }

  private async readDisk(key: string): Promise<Entry | undefined> {
    try {
      const raw = await readFile(this.file(key), "utf8");
      const parsed = JSON.parse(raw) as Entry;
      if (typeof parsed !== "object" || parsed === null || !("value" in parsed)) {
        throw new Error("malformed cache entry");
      }
      return parsed;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        // Quarantine anything unreadable/corrupt so it can't poison reads.
        void unlink(this.file(key)).catch(() => {});
      }
      return undefined;
    }
  }

  private async writeDisk(key: string, entry: Entry): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const target = this.file(key);
    const tmp = `${target}.tmp-${process.pid}-${Math.random().toString(36).slice(2)}`;
    await writeFile(tmp, JSON.stringify(entry), "utf8");
    await rename(tmp, target);
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const CACHE_TTL_MS = DAY_MS;

/** Shared cache for TCG API data. */
export const tcgCache: CacheStore = new LayeredCache(
  process.env.CACHE_DIR ?? path.join(process.cwd(), ".cache", "tcg"),
);
