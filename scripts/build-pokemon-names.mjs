// Builds data/pokemon-names.json — the National Dex (1..1025) English species
// names, used client-side for the /pokemon typeahead and server-side for the
// "did you mean" suggestions on a no-results binder. Run manually when a new
// generation lands: `node scripts/build-pokemon-names.mjs`. Source: PokéAPI
// (the same source as our Pokédex sprites + localized names), snapshotted so the
// app ships a static list with no runtime API dependency.
import { writeFileSync } from "node:fs";
import path from "node:path";

const MAX_DEX = 1025;
const CONCURRENCY = 16;

/** Card data + the token grammar use a straight apostrophe, not the curly one
 *  PokéAPI returns for Farfetch'd etc. */
function normalize(name) {
  return name.replace(/’/g, "'");
}

/** Mirror of slugifyPokemonName in lib/pokemon-binder.ts (lowercase, spaces→-). */
function slugify(name) {
  return normalize(name).trim().toLowerCase().replace(/\s+/g, "-");
}

/** Fallback display name from a PokéAPI slug, used only if a fetch fails. */
function displayFromSlug(slug) {
  return slug
    .split("-")
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
    .join(" ");
}

async function englishName(dex) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${dex}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const json = await res.json();
      const en = json.names.find((n) => n.language.name === "en");
      return normalize(en ? en.name : displayFromSlug(json.name));
    } catch {
      // retry once
    }
  }
  return null;
}

async function run() {
  const dexNumbers = Array.from({ length: MAX_DEX }, (_, i) => i + 1);
  const results = new Array(MAX_DEX);
  let next = 0;
  let done = 0;

  async function worker() {
    while (next < dexNumbers.length) {
      const i = next++;
      const dex = dexNumbers[i];
      const name = await englishName(dex);
      if (!name) throw new Error(`failed to fetch name for dex ${dex}`);
      results[i] = { dex, name, slug: slugify(name) };
      done++;
      if (done % 100 === 0) console.log(`  ${done}/${MAX_DEX}`);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Deterministic order by dex.
  results.sort((a, b) => a.dex - b.dex);
  const dest = path.join(process.cwd(), "data", "pokemon-names.json");
  writeFileSync(dest, JSON.stringify(results) + "\n");
  console.log(`wrote ${results.length} names → ${dest}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
