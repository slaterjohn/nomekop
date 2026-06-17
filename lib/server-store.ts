import path from "node:path";
import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

export interface CacheStore {
  getOrCompute<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T>;
  set(key: string, value: unknown, ttlMs: number): void;
}

type Row = { value: string; expiresAt: number };

/**
 * Server-side cache on SQLite (node:sqlite — built-in, zero deps): per-key TTL,
 * stale-while-revalidate, in-flight coalescing. Survives restarts so warm data
 * (sets, cards, prices) loads instantly. Falls back to an in-memory database
 * when the data directory is unwritable — the app degrades, never breaks.
 */
export class SqliteStore implements CacheStore {
  private db: DatabaseSync;
  private inflight = new Map<string, Promise<unknown>>();
  private pending = new Set<Promise<void>>();

  constructor(dbPath: string) {
    this.db = SqliteStore.openSafely(dbPath);
    // Concurrency: `next build` collects page data in parallel workers that each
    // open this same DB, and at runtime request handlers race the daily refresh.
    // Default journal mode + a zero busy-timeout make any of those collide with
    // SQLITE_BUSY ("database is locked"). The busy timeout MUST be set first: the
    // WAL switch and CREATE TABLE both take a write lock, so without it they fail
    // immediately instead of waiting. WAL then lets readers and a writer coexist.
    try {
      this.db.exec("PRAGMA busy_timeout = 10000");
    } catch {
      // unsupported — safe to ignore
    }
    try {
      this.db.exec("PRAGMA journal_mode = WAL");
    } catch {
      // in-memory fallback / unsupported pragma — safe to ignore
    }
    this.db.exec(
      `CREATE TABLE IF NOT EXISTS cache (
         key TEXT PRIMARY KEY,
         value TEXT NOT NULL,
         expiresAt INTEGER NOT NULL,
         updatedAt INTEGER NOT NULL
       )`,
    );
  }

  private static openSafely(dbPath: string): DatabaseSync {
    try {
      mkdirSync(path.dirname(dbPath), { recursive: true });
      return new DatabaseSync(dbPath);
    } catch {
      return new DatabaseSync(":memory:");
    }
  }

  async getOrCompute<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
    const row = this.read(key);
    if (row) {
      const value = JSON.parse(row.value) as T;
      if (row.expiresAt > Date.now()) return value;
      // Stale: serve now, refresh in the background; failures keep the stale row.
      const refresh = this.refresh(key, ttlMs, compute)
        .then(() => {})
        .catch(() => {});
      this.pending.add(refresh);
      void refresh.finally(() => this.pending.delete(refresh));
      return value;
    }
    return this.refresh(key, ttlMs, compute);
  }

  /** Read a stored value ignoring TTL. The cache manager and derived card
   *  index treat the store as durable state (manifest, per-set cards), not a
   *  freshness-gated cache, so they bypass expiry. */
  peek<T>(key: string): T | undefined {
    const row = this.read(key);
    return row ? (JSON.parse(row.value) as T) : undefined;
  }

  /** Force-write (the cache manager bypasses freshness checks). */
  set(key: string, value: unknown, ttlMs: number): void {
    const now = Date.now();
    this.db
      .prepare(
        `INSERT INTO cache (key, value, expiresAt, updatedAt) VALUES (?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value, expiresAt=excluded.expiresAt, updatedAt=excluded.updatedAt`,
      )
      .run(key, JSON.stringify(value), now + ttlMs, now);
  }

  /** Awaits background refreshes (tests, graceful shutdown). */
  async flush(): Promise<void> {
    while (this.inflight.size > 0 || this.pending.size > 0) {
      await Promise.allSettled([...this.inflight.values(), ...this.pending]);
    }
  }

  close(): void {
    try {
      this.db.close();
    } catch {
      // already closed
    }
  }

  private read(key: string): Row | undefined {
    try {
      return this.db.prepare("SELECT value, expiresAt FROM cache WHERE key = ?").get(key) as
        | Row
        | undefined;
    } catch {
      return undefined;
    }
  }

  private refresh<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(key);
    if (existing) return existing as Promise<T>;
    const p = (async () => {
      try {
        const value = await compute();
        try {
          this.set(key, value, ttlMs);
        } catch {
          // persistence is best-effort
        }
        return value;
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, p);
    return p;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const SETS_TTL_MS = DAY_MS;
/** Card payloads carry TCGplayer prices — kept no older than 12h per spec v2. */
export const CARDS_TTL_MS = 12 * 60 * 60 * 1000;

export const serverStore: SqliteStore = new SqliteStore(
  process.env.DB_PATH ??
    path.join(process.env.CACHE_DIR ?? path.join(process.cwd(), ".cache"), "bindermon.db"),
);
