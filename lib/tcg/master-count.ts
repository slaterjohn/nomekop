import { DEFAULT_CONFIG } from "@/lib/config";
import { buildBinderLayout } from "@/lib/layout";
import { serverStore } from "@/lib/server-store";
import { getCardsForSitemap } from "@/lib/tcg";
import type { TcgSet } from "@/lib/tcg/types";
import masterCountsData from "@/data/master-counts.json";

/** Curated, authoritative master-set counts (data/master-counts.json), keyed by
 *  set id. No API exposes master/pattern counts, so these are sourced from
 *  collector master-set guides and OVERRIDE the heuristic — applied fresh on top
 *  of the computed map, so a curated set's count is correct even with a cold or
 *  half-warmed cache (which would otherwise fall back to the plain total). */
const CURATED_MASTER_COUNTS = masterCountsData.counts as Record<string, number>;

/** 12h — matches the card TTL, so warmed counts refresh on the same cadence
 *  as the underlying card payloads. */
const MASTER_COUNTS_TTL_MS = 12 * 60 * 60 * 1000;
const STORE_KEY = "set-master-counts";

/** In-process memo so the 170+-set walk runs once per refresh window even when
 *  the durable store is unavailable (in-memory fallback). Keyed by a cheap
 *  signature of the set list (ids × printedTotals) so a refreshed sets list
 *  invalidates it; `computedAt` ages it out so it can't freeze stale counts. */
let memo: { signature: string; counts: Map<string, number>; computedAt: number } | undefined;

function signatureOf(sets: ReadonlyArray<Pick<TcgSet, "id" | "printedTotal">>): string {
  return sets.map((s) => `${s.id}:${s.printedTotal}`).join(",");
}

/**
 * The full master-set slot count for one set: every card plus its reverse-holo
 * and Poké/Master Ball mirrors (the app's default master config). Reads cards
 * via the cache-only peek — NEVER a live fetch — so it's safe at request time.
 * Falls back to `max(printedTotal, total)` when no cards are cached (a cold or
 * fixture-mode set), so the UI always shows a number.
 *
 * Pure given its inputs; exported for the hermetic unit test (which passes the
 * committed fixture cards directly, bypassing the peek).
 */
export function masterCountFor(
  set: Pick<TcgSet, "printedTotal" | "total">,
  cards: Parameters<typeof buildBinderLayout>[0],
): number {
  if (cards.length === 0) return Math.max(set.printedTotal, set.total);
  return buildBinderLayout(cards, set, { ...DEFAULT_CONFIG, mode: "master" }).stats.slots;
}

/**
 * Master-set card counts for every given set, keyed by set id. Memoized at
 * module scope (and persisted in serverStore with a 12h TTL) so the whole-list
 * computation runs once, not per request.
 *
 * Fixture-mode caveat: only base1/sv1/sv8pt5 have committed cards, so every
 * other set falls back to `max(printedTotal, total)` — that's expected. In live
 * prod the first-launch cache build warms every set, so real master counts show.
 */
async function computeMasterSetCounts(
  sets: ReadonlyArray<TcgSet>,
): Promise<Map<string, number>> {
  const signature = signatureOf(sets);
  const now = Date.now();
  // TTL-gated reads: never serve a snapshot older than the window, so a count
  // computed against a cold/half-warmed cache (e.g. right after a cache reset)
  // can't freeze forever — it recomputes once the cache fills. Entries written
  // by the old format (no computedAt) are treated as stale and recomputed.
  const fresh = (at: number | undefined): boolean =>
    typeof at === "number" && now - at < MASTER_COUNTS_TTL_MS;
  if (memo && memo.signature === signature && fresh(memo.computedAt)) return memo.counts;

  const stored = serverStore.peek<{
    signature: string;
    counts: [string, number][];
    computedAt?: number;
  }>(STORE_KEY);
  if (stored && stored.signature === signature && fresh(stored.computedAt)) {
    const counts = new Map(stored.counts);
    memo = { signature, counts, computedAt: stored.computedAt! };
    return counts;
  }

  const entries = await Promise.all(
    sets.map(async (set): Promise<[string, number]> => {
      // Cache-only peek — but in fixture mode it delegates to the fixture source,
      // which THROWS for sets without a committed fixture. Either way (throw or
      // cold-miss []), fall back to the printed/total estimate; never let one
      // set's missing cards 500 the whole /sets page.
      let cards: Awaited<ReturnType<typeof getCardsForSitemap>> = [];
      try {
        cards = await getCardsForSitemap(set.id);
      } catch {
        cards = [];
      }
      return [set.id, masterCountFor(set, cards)];
    }),
  );
  const counts = new Map(entries);
  memo = { signature, counts, computedAt: now };
  try {
    serverStore.set(STORE_KEY, { signature, counts: entries, computedAt: now }, MASTER_COUNTS_TTL_MS);
  } catch {
    // persistence is best-effort; the in-process memo still serves this lifetime
  }
  return counts;
}

/**
 * Master-set counts keyed by set id: the curated authoritative count where we
 * have one (data/master-counts.json), else the heuristic computation. The
 * curated override is applied on a fresh clone every call, so it never depends
 * on the memo/cache being warm — fixing both the cold-cache fallback (sets
 * showing their plain total) and heuristic inaccuracies (e.g. Ascended Heroes'
 * unmodeled Energy pattern).
 */
export async function getMasterSetCounts(
  sets: ReadonlyArray<TcgSet>,
): Promise<Map<string, number>> {
  const counts = new Map(await computeMasterSetCounts(sets));
  for (const set of sets) {
    const curated = CURATED_MASTER_COUNTS[set.id];
    if (typeof curated === "number") counts.set(set.id, curated);
  }
  return counts;
}
