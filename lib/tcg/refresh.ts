import { CARDS_TTL_MS, SETS_TTL_MS, serverStore, type SqliteStore } from "@/lib/server-store";
import { getDataSource } from "@/lib/tcg";
import { GENERATIONS } from "@/lib/pokedex";
import { POPULAR_ILLUSTRATOR_KEYS, POPULAR_POKEMON_KEYS } from "@/lib/tcg/warm-lists";
import type { CardDataSource } from "@/lib/tcg/types";

export type RefreshSummary = {
  sets: number;
  ok: number;
  failed: string[];
  /** Pokédex generations successfully pre-warmed. */
  pokedexOk?: number;
  /** Popular Pokémon binders pre-warmed. */
  pokemonOk?: number;
  /** Popular illustrator binders pre-warmed. */
  illustratorOk?: number;
  durationMs: number;
};

let running = false;

export function isRefreshRunning(): boolean {
  return running;
}

type Options = {
  source?: CardDataSource;
  store?: Pick<SqliteStore, "set">;
  /** Delay between sets — stays friendly to pokemontcg.io rate limits. */
  paceMs?: number;
  log?: (message: string) => void;
};

/**
 * The daily cache walk: re-fetches the sets list and every set's cards
 * (including TCGplayer prices) and force-writes them to the server store, so
 * users get warm loads and ≤12h-old prices without ever waiting on the API.
 */
export async function runRefreshAll(options: Options = {}): Promise<RefreshSummary> {
  if (running) throw new Error("refresh already running");
  running = true;
  const started = Date.now();
  const source = options.source ?? getDataSource();
  const store = options.store ?? serverStore;
  const paceMs = options.paceMs ?? 750;
  const log = options.log ?? ((m: string) => console.log(`[refresh] ${m}`));

  try {
    const sets = await source.getSets();
    store.set("sets", sets, SETS_TTL_MS);
    log(`sets list refreshed (${sets.length} sets)`);

    let ok = 0;
    const failed: string[] = [];
    for (const [index, set] of sets.entries()) {
      try {
        const cards = await source.getCards(set.id);
        store.set(`cards:${set.id}`, cards, CARDS_TTL_MS);
        ok += 1;
      } catch {
        failed.push(set.id);
      }
      if ((index + 1) % 25 === 0) log(`${index + 1}/${sets.length} sets refreshed`);
      if (paceMs > 0) await new Promise((r) => setTimeout(r, paceMs));
    }

    // Pre-warm the Pokédex generation queries — each is a heavy cross-set
    // fetch (~90s cold), so keeping them warm makes first visits instant.
    // Force-write the same cache keys lib/tcg.getPokedexCards reads.
    let pokedexOk = 0;
    for (const gen of GENERATIONS) {
      try {
        const cards = await source.getCardsByDexRange(gen.min, gen.max);
        store.set(`pokedex:${gen.id}`, cards, CARDS_TTL_MS);
        pokedexOk += 1;
      } catch {
        // a failed generation just stays cold until next run
      }
      if (paceMs > 0) await new Promise((r) => setTimeout(r, paceMs));
    }
    log(`pokédex generations warmed: ${pokedexOk}/${GENERATIONS.length}`);

    // Pre-warm popular Pokémon and illustrator binders (paced like the rest).
    let pokemonOk = 0;
    for (const { name, key } of POPULAR_POKEMON_KEYS) {
      try {
        store.set(key, await source.searchCardsByName(name.toLowerCase()), CARDS_TTL_MS);
        pokemonOk += 1;
      } catch {
        // stays cold until first view
      }
      if (paceMs > 0) await new Promise((r) => setTimeout(r, paceMs));
    }
    let illustratorOk = 0;
    for (const { name, key } of POPULAR_ILLUSTRATOR_KEYS) {
      try {
        store.set(key, await source.searchCardsByArtist(name), CARDS_TTL_MS);
        illustratorOk += 1;
      } catch {
        // stays cold until first view
      }
      if (paceMs > 0) await new Promise((r) => setTimeout(r, paceMs));
    }
    log(`popular binders warmed: ${pokemonOk} pokémon, ${illustratorOk} illustrators`);

    const summary: RefreshSummary = {
      sets: sets.length,
      ok,
      failed,
      pokedexOk,
      pokemonOk,
      illustratorOk,
      durationMs: Date.now() - started,
    };
    log(`done: ${ok}/${sets.length} ok${failed.length ? `, failed: ${failed.join(", ")}` : ""}`);
    return summary;
  } finally {
    running = false;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
let scheduled = false;

/**
 * Schedules the daily walk (first run shortly after boot, then every 24h).
 * Idempotent across dev hot reloads; skipped in fixture mode and tests.
 */
export function scheduleDailyRefresh(): void {
  if (scheduled) return;
  if (process.env.TCG_DATA_SOURCE === "fixture") return;
  if (process.env.DISABLE_BACKGROUND_REFRESH === "1") return;
  scheduled = true;

  const kick = () => {
    runRefreshAll().catch((err) => console.error("[refresh] failed:", err));
  };
  // Initial run two minutes after boot — lets the server settle first.
  setTimeout(kick, 2 * 60 * 1000).unref?.();
  setInterval(kick, DAY_MS).unref?.();
}
