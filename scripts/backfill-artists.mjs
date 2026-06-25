// Backfills illustrator credits for sets where pokemontcg.io ships no artist
// field (e.g. Prismatic Evolutions, Surging Sparks) by matching against TCGdex,
// which does carry them. Writes data/artist-overrides.json (cardId -> artist),
// applied at read time by lib/tcg/artist-overrides.ts.
//
// Run manually after new sets land / the cache warms:  node scripts/backfill-artists.mjs
// Reads the local SQLite cache (never CI). Network: TCGdex REST API.
import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { matchArtistsByNumber } from "./backfill-match.mjs";

const AS_OF = "June 2026";
const TCGDEX = "https://api.tcgdex.net/v2/en";
const CONCURRENCY = 8;

// pokemontcg.io set name → TCGdex set id, for names that don't resolve cleanly
// by normalised-name match. Checked only as a fallback.
const CURATED_TCGDEX_ID = {
  "scarlet & violet energies": "sve",
};

const db = new DatabaseSync(path.join(process.cwd(), ".cache", "bindermon.db"), { readOnly: true });
const get = (key) => {
  const row = db.prepare("SELECT value FROM cache WHERE key = ?").get(key);
  return row ? JSON.parse(row.value) : null;
};

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");

async function fetchJson(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
      if (res.status === 404) return null;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 300 * (i + 1)));
  }
  return null;
}

async function mapWithConcurrency(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

async function main() {
  const sets = get("sets");
  if (!sets) throw new Error("no 'sets' in cache DB — warm the cache first");

  // Sets that have cached cards but zero artist credits — the ones to backfill.
  const targets = [];
  for (const s of sets) {
    const cards = get(`cards:${s.id}`);
    if (!cards || cards.length === 0) continue;
    if (cards.some((c) => c.artist && String(c.artist).trim())) continue;
    targets.push({ set: s, cards });
  }
  console.log(`artist-less sets to backfill: ${targets.map((t) => t.set.id).join(", ") || "(none)"}`);

  const tcgdexSets = (await fetchJson(`${TCGDEX}/sets`)) ?? [];
  const tcgdexByName = new Map(tcgdexSets.map((s) => [norm(s.name), s.id]));

  const overrides = {};
  const summary = [];
  for (const { set, cards } of targets) {
    const tcgdexId = tcgdexByName.get(norm(set.name)) ?? CURATED_TCGDEX_ID[set.name.toLowerCase()];
    if (!tcgdexId) {
      summary.push({ set: set.id, status: "no TCGdex set (skipped)" });
      continue;
    }
    const detail = await fetchJson(`${TCGDEX}/sets/${tcgdexId}`);
    const briefs = detail?.cards ?? [];
    if (briefs.length === 0) {
      summary.push({ set: set.id, status: `TCGdex set ${tcgdexId} empty (skipped)` });
      continue;
    }
    process.stdout.write(`  ${set.id} → ${tcgdexId}: fetching ${briefs.length} cards… `);
    const full = await mapWithConcurrency(briefs, CONCURRENCY, (b) => fetchJson(`${TCGDEX}/cards/${b.id}`));
    const tcgdexCards = full
      .filter(Boolean)
      .map((c) => ({ localId: c.localId, illustrator: c.illustrator }));
    const { overrides: got, unmatched } = matchArtistsByNumber(
      cards.map((c) => ({ id: c.id, number: c.number })),
      tcgdexCards,
    );
    Object.assign(overrides, got);
    console.log(`matched ${Object.keys(got).length}/${cards.length} (${unmatched.length} unmatched)`);
    summary.push({
      set: set.id,
      tcgdexId,
      matched: Object.keys(got).length,
      total: cards.length,
      unmatched: unmatched.length,
    });
  }

  const dest = path.join(process.cwd(), "data", "artist-overrides.json");
  const prev = JSON.parse(readFileSync(dest, "utf8"));
  writeFileSync(
    dest,
    JSON.stringify({ note: prev.note, asOf: AS_OF, overrides }, null, 2) + "\n",
  );
  console.log(`\nwrote ${Object.keys(overrides).length} overrides → ${dest}`);
  console.table(summary);
}

main();
