// Regenerates lib/content/faqs/data.json from the cache DB. Run manually after
// new sets land: `node scripts/build-faqs.mjs`. Reads the same SQLite cache the
// app uses; never run in CI (the DB is local-only). Figures are snapshotted so
// builds/tests stay hermetic. Master-set + selection logic is in faq-compute.mjs
// (guarded against the app's real logic by test/unit/faqs-compute.test.ts).
import { DatabaseSync } from "node:sqlite";
import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  masterSlotCount, reverseHoloCount, ballCounts, supertypeCounts,
  illustrationRareCount, rarityHistogram, rarestOf, mostValuableOf, chaseOf,
  marqueePokemonOf,
} from "./faq-compute.mjs";

const POKEMON_PER_SET = 5;
const AS_OF = "June 2026";
// How many eras (series) back to cover, newest first.
const ERA_COUNT = 3;
// Non-expansion sets that don't fit the per-set FAQ shape (master sets, reverse
// holos, binder layouts): basic-energy sets, promo grab-bags, and the bundled
// sub-sets printed inside a parent set's packs rather than sold standalone.
const EXCLUDE_NAME =
  /Promos|Energies|Trainer Gallery|Galarian Gallery|Shiny Vault|Classic Collection/i;

const db = new DatabaseSync(path.join(process.cwd(), ".cache", "bindermon.db"), { readOnly: true });
const get = (key) => {
  const row = db.prepare("SELECT value FROM cache WHERE key = ?").get(key);
  return row ? JSON.parse(row.value) : null;
};

function setSlug(name) {
  return String(name).toLowerCase().replace(/['.]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const allSets = get("sets");
if (!allSets) throw new Error("no 'sets' in cache DB — warm the cache first");

// The ERA_COUNT newest series (by their newest set's release date).
const seriesNewest = new Map();
for (const s of allSets) {
  const cur = seriesNewest.get(s.series);
  if (!cur || s.releaseDate > cur) seriesNewest.set(s.series, s.releaseDate);
}
const eras = new Set(
  [...seriesNewest.entries()]
    .sort((a, b) => b[1].localeCompare(a[1]))
    .slice(0, ERA_COUNT)
    .map(([series]) => series),
);

// All real expansions across those eras, newest first.
const sets = [...allSets]
  .filter((s) => eras.has(s.series) && !EXCLUDE_NAME.test(s.name))
  .sort((a, b) => (a.releaseDate < b.releaseDate ? 1 : -1));

// Size rank (largest printedTotal = 1) across every set in scope.
const bySize = [...sets].sort((a, b) => b.printedTotal - a.printedTotal);
const sizeRank = new Map(bySize.map((s, i) => [s.id, i + 1]));

const out = { asOf: AS_OF, sets: [] };
for (const s of sets) {
  const cards = get(`cards:${s.id}`);
  if (!cards) throw new Error(`no cards cached for ${s.id}`);
  const st = supertypeCounts(cards);
  const balls = ballCounts(cards);
  out.sets.push({
    id: s.id,
    name: s.name,
    slug: setSlug(s.name),
    series: s.series,
    logoUrl: s.logoUrl ?? "",
    symbolUrl: s.symbolUrl ?? "",
    releaseDate: s.releaseDate,
    printedTotal: s.printedTotal,
    total: s.total,
    secretCount: Math.max(0, s.total - s.printedTotal),
    pokemonCount: st.pokemon,
    trainerCount: st.trainer,
    energyCount: st.energy,
    reverseHoloCount: reverseHoloCount(cards),
    masterSetCount: masterSlotCount(cards),
    pokeballCount: balls.pokeball,
    masterballCount: balls.masterball,
    hasBallPatterns: balls.pokeball > 0 || balls.masterball > 0,
    illustrationRareCount: illustrationRareCount(cards),
    rarityHistogram: rarityHistogram(cards),
    rarestCard: rarestOf(cards),
    mostValuableCard: mostValuableOf(cards),
    chaseCards: chaseOf(cards, 6),
    marqueePokemon: marqueePokemonOf(cards, POKEMON_PER_SET),
    sizeRankAmongRecent: sizeRank.get(s.id),
  });
}

const dest = path.join(process.cwd(), "lib", "content", "faqs", "data.json");
writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
console.log(`wrote ${out.sets.length} sets → ${dest}`);
