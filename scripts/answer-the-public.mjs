// Answer-The-Public harvester: discovers the real related searches people make
// about Pokémon cards / sets / Pokémon / illustrators, to drive FAQ + keyword
// coverage on the entity pages (Phases 3/4). Dev-time, manual, never CI:
//   node scripts/answer-the-public.mjs            # focused & deep (default)
//   node scripts/answer-the-public.mjs --alphabet # add the a–z sweep (heavy)
// Writes data/keyword-research/candidates.json (structured) and
// docs/keyword-research/report.md (human-readable). Network: Google/Bing/DDG
// autocomplete. Output is research only — it does NOT publish FAQs.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { expandSeed, parseSuggest, aggregate, buildClusters } from "./atp-core.mjs";

const AS_OF = "June 2026";
const CONCURRENCY = 8;
const TOP_POKEMON = 30;
const TOP_ARTISTS = 15;
const RECENT_SETS = 15;
const USE_ALPHABET = process.argv.includes("--alphabet");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

const BASE_SEEDS = [
  "pokemon cards", "pokemon tcg", "pokemon card binder", "pokemon card collection",
  "pokemon card value", "pokemon card set", "pokemon card rarity", "rarest pokemon card",
  "most expensive pokemon card", "pokemon card grading", "pokemon booster box",
  "pokemon card list", "japanese pokemon cards", "pokemon card illustrator",
  "pokemon elite trainer box",
];

const ENGINE_URL = {
  google: (q) => `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}`,
  bing: (q) => `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(q)}`,
  ddg: (q) => `https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}&type=list`,
};

const readJson = (rel) => JSON.parse(readFileSync(path.join(process.cwd(), rel), "utf8"));

function buildSeeds() {
  const entities = readJson("lib/content/entities/data.json");
  const faqs = readJson("lib/content/faqs/data.json");
  const seeds = [];
  for (const s of BASE_SEEDS) seeds.push({ seed: s, type: "base" });
  const topPokemon = [...entities.pokemon].sort((a, b) => b.cardCount - a.cardCount).slice(0, TOP_POKEMON);
  for (const p of topPokemon) seeds.push({ seed: `${p.name.toLowerCase()} card`, type: "pokemon", entity: { slug: p.slug, name: p.name } });
  for (const a of entities.artists.slice(0, TOP_ARTISTS)) seeds.push({ seed: a.name.toLowerCase(), type: "artist", entity: { slug: a.slug, name: a.name } });
  for (const s of faqs.sets.slice(0, RECENT_SETS)) seeds.push({ seed: `${s.name.toLowerCase()} cards`, type: "set", entity: { slug: s.slug, name: s.name, id: s.id } });
  return seeds;
}

async function fetchSuggest(engine, q, tries = 3) {
  const url = ENGINE_URL[engine](q);
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json,text/javascript,*/*" } });
      if (res.ok) {
        const text = await res.text();
        return parseSuggest(JSON.parse(text));
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250 * (i + 1)));
  }
  return [];
}

async function runTasks(tasks, limit, fn) {
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      await fn(tasks[i]);
      if (++done % 100 === 0) process.stdout.write(`  …${done}/${tasks.length} queries\r`);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
}

function reportMarkdown(out) {
  const top = (arr) => arr.slice(0, 12).map((s) => `  - ${s.text} _(×${s.freq}, ${s.intent})_`).join("\n");
  const lines = [
    "# Pokémon TCG keyword research (Answer-The-Public)",
    "",
    `_Generated ${out.asOf} from Google/Bing/DuckDuckGo autocomplete — ${out.stats.seeds} seeds, ${out.stats.suggestions} unique suggestions. Research only; not published FAQs._`,
    "",
  ];
  // Overall intent leaderboard.
  const intentTotals = {};
  for (const s of out.seeds) for (const sg of s.suggestions) intentTotals[sg.intent] = (intentTotals[sg.intent] ?? 0) + 1;
  lines.push("## Intent leaderboard\n");
  for (const [intent, n] of Object.entries(intentTotals).sort((a, b) => b[1] - a[1])) lines.push(`- **${intent}** — ${n}`);
  lines.push("");
  for (const s of out.seeds) {
    lines.push(`## ${s.seed}  \`${s.type}\``);
    for (const [bucket, items] of Object.entries(s.clusters)) {
      if (items.length === 0) continue;
      lines.push(`\n**${bucket}**`);
      lines.push(top(items));
    }
    lines.push("");
  }
  return lines.join("\n") + "\n";
}

async function main() {
  const seeds = buildSeeds();
  console.log(`seeds: ${seeds.length} (${BASE_SEEDS.length} base, ${TOP_POKEMON} Pokémon, ${TOP_ARTISTS} artists, ${RECENT_SETS} sets)`);

  // One fetch task per (seed, engine, query): Google drives modifier expansion;
  // Bing + DDG add breadth on the bare seed only.
  const raw = new Map(seeds.map((s) => [s.seed, []]));
  const tasks = [];
  for (const s of seeds) {
    for (const q of expandSeed(s.seed, { alphabet: USE_ALPHABET })) tasks.push({ seed: s.seed, engine: "google", q });
    tasks.push({ seed: s.seed, engine: "bing", q: s.seed });
    tasks.push({ seed: s.seed, engine: "ddg", q: s.seed });
  }
  console.log(`queries: ${tasks.length} (alphabet ${USE_ALPHABET ? "ON" : "off"}) — harvesting…`);

  await runTasks(tasks, CONCURRENCY, async (t) => {
    const suggestions = await fetchSuggest(t.engine, t.q);
    const bucket = raw.get(t.seed);
    for (const text of suggestions) bucket.push({ text, engine: t.engine });
  });
  process.stdout.write("\n");

  let suggestionTotal = 0;
  const outSeeds = seeds.map((s) => {
    const suggestions = aggregate(raw.get(s.seed), s.seed);
    suggestionTotal += suggestions.length;
    return { ...s, suggestions, clusters: buildClusters(suggestions) };
  });

  const out = {
    asOf: AS_OF,
    stats: { seeds: seeds.length, queries: tasks.length, suggestions: suggestionTotal, alphabet: USE_ALPHABET },
    seeds: outSeeds,
  };

  mkdirSync(path.join(process.cwd(), "data", "keyword-research"), { recursive: true });
  mkdirSync(path.join(process.cwd(), "docs", "keyword-research"), { recursive: true });
  const jsonDest = path.join(process.cwd(), "data", "keyword-research", "candidates.json");
  const mdDest = path.join(process.cwd(), "docs", "keyword-research", "report.md");
  writeFileSync(jsonDest, JSON.stringify(out, null, 2) + "\n");
  writeFileSync(mdDest, reportMarkdown(out));
  console.log(`\nwrote ${suggestionTotal} unique suggestions across ${seeds.length} seeds`);
  console.log(`  → ${jsonDest}`);
  console.log(`  → ${mdDest}`);
}

main();
