// Regenerates lib/content/entities/data.json from the cache DB — per-Pokémon and
// per-illustrator stats for the entity info pages. Run manually after new sets
// land / the cache warms:  node scripts/build-entities.mjs
// Mirrors build-faqs.mjs: reads the local SQLite cache (never CI), snapshots
// figures so builds/tests stay hermetic. Stat logic lives in entity-compute.mjs
// (guarded by test/unit/entity-compute.test.ts).
import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { applyBallPatterns } from "./faq-compute.mjs";
import { pokemonStatsFor, artistStatsFrom } from "./entity-compute.mjs";

const AS_OF = "June 2026";
const ARTIST_MIN_CARDS = 5;

const db = new DatabaseSync(path.join(process.cwd(), ".cache", "bindermon.db"), { readOnly: true });
const get = (key) => {
  const row = db.prepare("SELECT value FROM cache WHERE key = ?").get(key);
  return row ? JSON.parse(row.value) : null;
};
const readJson = (rel) => JSON.parse(readFileSync(path.join(process.cwd(), rel), "utf8"));

const artistOverrides = readJson("data/artist-overrides.json").overrides ?? {};
function applyArtistOverrides(cards) {
  return cards.map((c) =>
    c.artist && String(c.artist).trim() ? c : artistOverrides[c.id] ? { ...c, artist: artistOverrides[c.id] } : c,
  );
}

const allSets = get("sets");
if (!allSets) throw new Error("no 'sets' in cache DB — warm the cache first");
const species = readJson("data/pokemon-names.json"); // [{ dex, name, slug }]
const nameByDex = new Map(species.map((s) => [s.dex, { name: s.name, slug: s.slug }]));

// Union every cached set's cards, augmented exactly as the app reads them
// (ball patterns + artist overrides) and joined with set metadata.
const cards = [];
const byDex = new Map(); // dex -> cards (built once for fast per-species lookup)
for (const set of allSets) {
  const raw = get(`cards:${set.id}`);
  if (!raw) continue;
  const augmented = applyArtistOverrides(applyBallPatterns(set.id, raw));
  for (const c of augmented) {
    const card = { ...c, setId: set.id, setName: set.name, setReleaseDate: set.releaseDate };
    cards.push(card);
    if (Array.isArray(card.dex)) {
      for (const d of card.dex) {
        const bucket = byDex.get(d);
        if (bucket) bucket.push(card);
        else byDex.set(d, [card]);
      }
    }
  }
}

// Pokémon: one entity per species that has ≥1 card, keyed by dex (exact species).
const pokemon = [];
for (const s of species) {
  const speciesCards = byDex.get(s.dex);
  if (!speciesCards || speciesCards.length === 0) continue;
  pokemon.push(pokemonStatsFor({ dex: s.dex, name: s.name, slug: s.slug }, speciesCards));
}

// Artists: full stats for those ≥ threshold; an index of everyone for linking.
const { artists, artistIndex } = artistStatsFrom(cards, ARTIST_MIN_CARDS, nameByDex);

const dir = path.join(process.cwd(), "lib", "content", "entities");

// Full stats — imported only by the entity page routes.
const full = {
  asOf: AS_OF,
  thresholds: { artistMinCards: ARTIST_MIN_CARDS },
  pokemon,
  artists,
  artistIndex,
};
const dataDest = path.join(dir, "data.json");
writeFileSync(dataDest, JSON.stringify(full, null, 2) + "\n");

// Lightweight catalog — slugs, display names and gating only. Imported by the
// sitemap and (Phase 5) the cross-linker, which run on every page, so it must
// stay small (no histograms, no card refs).
const index = {
  asOf: AS_OF,
  thresholds: { artistMinCards: ARTIST_MIN_CARDS },
  pokemon: pokemon.map((p) => ({ dex: p.dex, slug: p.slug, name: p.name })),
  artists: artistIndex, // { slug, name, cardCount } for everyone
};
const indexDest = path.join(dir, "index.json");
writeFileSync(indexDest, JSON.stringify(index, null, 2) + "\n");

console.log(
  `wrote ${pokemon.length} Pokémon, ${artists.length} artist pages (≥${ARTIST_MIN_CARDS}), ${artistIndex.length} artists indexed`,
);
console.log(`  → ${dataDest}`);
console.log(`  → ${indexDest}`);
