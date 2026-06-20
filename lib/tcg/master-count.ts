import { DEFAULT_CONFIG } from "@/lib/config";
import { buildBinderLayout } from "@/lib/layout";
import { serverStore } from "@/lib/server-store";
import { getCardsForSitemap } from "@/lib/tcg";
import type { TcgSet } from "@/lib/tcg/types";

/** 12h — matches the card TTL, so warmed counts refresh on the same cadence
 *  as the underlying card payloads. */
const MASTER_COUNTS_TTL_MS = 12 * 60 * 60 * 1000;
const STORE_KEY = "set-master-counts";

/** In-process memo so the 170+-set walk runs once per server lifetime even when
 *  the durable store is unavailable (in-memory fallback). Keyed by a cheap
 *  signature of the set list (ids × printedTotals) so a refreshed sets list
 *  invalidates it. */
let memo: { signature: string; counts: Map<string, number> } | undefined;

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
export async function getMasterSetCounts(
  sets: ReadonlyArray<TcgSet>,
): Promise<Map<string, number>> {
  const signature = signatureOf(sets);
  if (memo && memo.signature === signature) return memo.counts;

  const stored = serverStore.peek<{ signature: string; counts: [string, number][] }>(STORE_KEY);
  if (stored && stored.signature === signature) {
    const counts = new Map(stored.counts);
    memo = { signature, counts };
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
  memo = { signature, counts };
  try {
    serverStore.set(STORE_KEY, { signature, counts: entries }, MASTER_COUNTS_TTL_MS);
  } catch {
    // persistence is best-effort; the in-process memo still serves this lifetime
  }
  return counts;
}
