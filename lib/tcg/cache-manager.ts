import { CARDS_TTL_MS, SETS_TTL_MS, serverStore, type SqliteStore } from "@/lib/server-store";
import { getDataSource } from "@/lib/tcg";
import { invalidateCardIndex } from "@/lib/tcg/card-index";
import { TcgError, type CardDataSource, type TcgSet } from "@/lib/tcg/types";

/**
 * Background cache strategy (replaces the old "re-fetch everything nightly"
 * walk). Driven by a durable manifest + a persisted, resumable work queue:
 *
 *  - No data yet            → fetch every set's cards (full build).
 *  - Data + no new sets     → nothing, unless the cache is ≥14 days old.
 *  - New set(s) released    → fetch just those; the derived Pokémon/illustrator
 *                             index is invalidated so the new cards appear.
 *  - Cache ≥14 days old      → refetch every set (slow, queued).
 *
 * Everything goes through one queue, paced to stay under pokemontcg.io's rate
 * limit. If a request is rate-limited past its retries, the run stops with the
 * queue intact and the next run resumes from the first unfinished set.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
export const FULL_REFRESH_AGE_MS = 14 * DAY_MS;
const MANIFEST_KEY = "cache:manifest";
const QUEUE_KEY = "cache:queue";
/** Manifest + queue are durable state, not freshness caches — never expire. */
const PERSIST_TTL_MS = 100 * 365 * DAY_MS;

export type CacheManifest = {
  /** When the full cache was last (re)built — drives the 14-day refresh. */
  builtAt: number;
  /** Sets we have fetched cards for — diffed to spot new releases. */
  knownSetIds: string[];
  /** Last time the nightly check ran (any outcome). */
  lastRunAt: number;
};

type Queue = {
  kind: "full" | "incremental";
  /** Set ids still to fetch; the head is retried until it succeeds. */
  pending: string[];
};

export type CachePlan =
  | { action: "full"; setIds: string[] }
  | { action: "incremental"; setIds: string[] }
  | { action: "noop" };

export type CacheCheckSummary = {
  action: "full" | "incremental" | "noop" | "resumed" | "rate-limited" | "already-running";
  fetched: number;
  failed: string[];
  /** True when the run stopped early on sustained rate limiting. */
  rateLimited: boolean;
  durationMs: number;
};

type Options = {
  source?: CardDataSource;
  store?: SqliteStore;
  /** Delay between sets — friendly to the API's rate limit. */
  paceMs?: number;
  /** Retries for a single set before the run stops and resumes later. */
  maxRateLimitRetries?: number;
  /** Backoff before retrying a rate-limited set (overridable for tests). */
  backoff?: (attempt: number) => number;
  now?: number;
  log?: (message: string) => void;
};

let running = false;

export function isCacheCheckRunning(): boolean {
  return running;
}

export function readManifest(store: SqliteStore = serverStore): CacheManifest | undefined {
  return store.peek<CacheManifest>(MANIFEST_KEY);
}

/** Has the full cache ever been built? The read path uses this (indirectly, via
 *  set coverage) to decide whether to derive binders or fall back to the API. */
export function isCacheBuilt(store: SqliteStore = serverStore): boolean {
  return readManifest(store) !== undefined;
}

function writeManifest(store: SqliteStore, manifest: CacheManifest): void {
  store.set(MANIFEST_KEY, manifest, PERSIST_TTL_MS);
}

function readQueue(store: SqliteStore): Queue | undefined {
  return store.peek<Queue>(QUEUE_KEY);
}

function writeQueue(store: SqliteStore, queue: Queue): void {
  store.set(QUEUE_KEY, queue, PERSIST_TTL_MS);
}

function clearQueue(store: SqliteStore): void {
  store.set(QUEUE_KEY, { kind: "full", pending: [] } satisfies Queue, PERSIST_TTL_MS);
}

function isRateLimited(err: unknown): boolean {
  return err instanceof TcgError && (err.status === 429 || err.kind === "timeout");
}

function defaultBackoff(attempt: number): number {
  // 5s, 15s, 45s, 135s, capped — gives the API room to recover.
  return Math.min(5_000 * 3 ** (attempt - 1), 5 * 60_000);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Decide what work (if any) is due. Always refreshes the sets list first so new
 * releases are visible. Returns the set ids to (re)fetch.
 */
export async function planRefresh(
  store: SqliteStore,
  source: CardDataSource,
  now: number,
): Promise<CachePlan> {
  const manifest = readManifest(store);
  const cachedSets = store.peek<TcgSet[]>("sets");

  // Nothing cached yet → full build. Fetch the sets list as part of it.
  if (!manifest || !cachedSets || cachedSets.length === 0) {
    const sets = await source.getSets();
    store.set("sets", sets, SETS_TTL_MS);
    return { action: "full", setIds: sets.map((s) => s.id) };
  }

  // Refresh the sets list to detect new releases.
  const sets = await source.getSets();
  store.set("sets", sets, SETS_TTL_MS);
  const known = new Set(manifest.knownSetIds);
  const newSetIds = sets.filter((s) => !known.has(s.id)).map((s) => s.id);

  if (newSetIds.length > 0) return { action: "incremental", setIds: newSetIds };
  if (now - manifest.builtAt >= FULL_REFRESH_AGE_MS) {
    return { action: "full", setIds: sets.map((s) => s.id) };
  }
  return { action: "noop" };
}

/**
 * Drain the queue, fetching one set's cards at a time. Retries a rate-limited
 * set with backoff; if it's still limited after `maxRateLimitRetries`, stops
 * with the queue intact (the head set stays pending) so the next run resumes
 * exactly where this one left off.
 */
async function processQueue(
  store: SqliteStore,
  source: CardDataSource,
  opts: Required<Pick<Options, "paceMs" | "maxRateLimitRetries" | "backoff" | "log">>,
): Promise<{ fetched: number; failed: string[]; rateLimited: boolean }> {
  const failed: string[] = [];
  let fetched = 0;
  let queue = readQueue(store);

  while (queue && queue.pending.length > 0) {
    const setId = queue.pending[0]!;
    let rateLimitAttempts = 0;
    let outcome: "done" | "failed" | "stop" = "failed";

    for (;;) {
      try {
        const cards = await source.getCards(setId);
        store.set(`cards:${setId}`, cards, CARDS_TTL_MS);
        fetched += 1;
        outcome = "done";
        break;
      } catch (err) {
        if (isRateLimited(err)) {
          rateLimitAttempts += 1;
          if (rateLimitAttempts > opts.maxRateLimitRetries) {
            opts.log(`rate-limited on ${setId}; stopping, will resume next run`);
            outcome = "stop";
            break;
          }
          const delay = opts.backoff(rateLimitAttempts);
          opts.log(`rate-limited on ${setId}, backoff ${delay}ms (try ${rateLimitAttempts})`);
          await sleep(delay);
          continue; // retry the SAME set
        }
        // A non-rate-limit error won't improve by waiting — skip this set.
        failed.push(setId);
        outcome = "failed";
        break;
      }
    }

    if (outcome === "stop") return { fetched, failed, rateLimited: true };

    // Pop the head (succeeded or permanently skipped) and persist progress so a
    // crash/restart resumes from the next set.
    queue = { ...queue, pending: queue.pending.slice(1) };
    writeQueue(store, queue);
    if (opts.paceMs > 0 && queue.pending.length > 0) await sleep(opts.paceMs);
  }

  return { fetched, failed, rateLimited: false };
}

/**
 * The nightly entry point. Resumes an interrupted queue if one exists; otherwise
 * plans fresh work. Finalises the manifest + invalidates the derived index when
 * the queue fully drains.
 */
export async function runCacheCheck(options: Options = {}): Promise<CacheCheckSummary> {
  const started = options.now ?? Date.now();
  if (running) {
    return { action: "already-running", fetched: 0, failed: [], rateLimited: false, durationMs: 0 };
  }
  running = true;
  const store = options.store ?? serverStore;
  const source = options.source ?? getDataSource();
  const now = options.now ?? Date.now();
  const log = options.log ?? ((m: string) => console.log(`[cache] ${m}`));
  const procOpts = {
    paceMs: options.paceMs ?? 750,
    maxRateLimitRetries: options.maxRateLimitRetries ?? 5,
    backoff: options.backoff ?? defaultBackoff,
    log,
  };

  try {
    const existing = readQueue(store);
    let kind: Queue["kind"];
    let action: CacheCheckSummary["action"];

    if (existing && existing.pending.length > 0) {
      // Resume an interrupted run.
      kind = existing.kind;
      action = "resumed";
      log(`resuming ${kind} queue: ${existing.pending.length} sets pending`);
    } else {
      const plan = await planRefresh(store, source, now);
      if (plan.action === "noop") {
        const manifest = readManifest(store);
        if (manifest) writeManifest(store, { ...manifest, lastRunAt: now });
        log("cache fresh — nothing to do");
        return {
          action: "noop",
          fetched: 0,
          failed: [],
          rateLimited: false,
          durationMs: Date.now() - started,
        };
      }
      kind = plan.action;
      action = plan.action;
      writeQueue(store, { kind, pending: plan.setIds });
      log(`${plan.action}: ${plan.setIds.length} sets queued`);
    }

    const result = await processQueue(store, source, procOpts);

    if (result.rateLimited) {
      const manifest = readManifest(store);
      if (manifest) writeManifest(store, { ...manifest, lastRunAt: now });
      return {
        action: "rate-limited",
        fetched: result.fetched,
        failed: result.failed,
        rateLimited: true,
        durationMs: Date.now() - started,
      };
    }

    // Queue drained — the derived index may be stale, and the manifest advances.
    invalidateCardIndex();
    const sets = store.peek<TcgSet[]>("sets") ?? [];
    const prev = readManifest(store);
    writeManifest(store, {
      builtAt: kind === "full" || !prev ? now : prev.builtAt,
      knownSetIds: sets.map((s) => s.id),
      lastRunAt: now,
    });
    clearQueue(store);
    log(`done: fetched ${result.fetched}, failed ${result.failed.length}`);
    return {
      action,
      fetched: result.fetched,
      failed: result.failed,
      rateLimited: false,
      durationMs: Date.now() - started,
    };
  } finally {
    running = false;
  }
}

let scheduled = false;

/**
 * Schedules the cache check: a catch-up run a minute after boot (which resumes
 * any queue an earlier process left behind), then nightly at ~03:00 local.
 * Idempotent across dev hot reloads; skipped in fixture mode and tests.
 */
export function scheduleNightlyRefresh(): void {
  if (scheduled) return;
  if (process.env.TCG_DATA_SOURCE === "fixture") return;
  if (process.env.DISABLE_BACKGROUND_REFRESH === "1") return;
  scheduled = true;

  const tick = () => {
    runCacheCheck().catch((err) => console.error("[cache] check failed:", err));
  };

  // Catch-up shortly after boot — settles the server, resumes any pending queue.
  setTimeout(tick, 60_000).unref?.();

  // Then nightly at ~03:00 local.
  const now = new Date();
  const next = new Date(now);
  next.setHours(3, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  setTimeout(() => {
    tick();
    setInterval(tick, DAY_MS).unref?.();
  }, next.getTime() - now.getTime()).unref?.();
}
