// Captures real pokemontcg.io responses into test/fixtures/*.json, trimmed to
// the fields in lib/tcg/types.ts. Run rarely; fixtures are committed.
//   node scripts/capture-fixtures.mjs
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "https://api.pokemontcg.io/v2";
const OUT = path.join(process.cwd(), "test", "fixtures");
const CARD_SETS = ["base1", "sv1"];

const headers = { Accept: "application/json" };
if (process.env.POKEMONTCG_API_KEY) headers["X-Api-Key"] = process.env.POKEMONTCG_API_KEY;

async function get(p) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(`${BASE}${p}`, { headers, signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Error(`${res.status} for ${p}`);
      return await res.json();
    } catch (err) {
      console.warn(`attempt ${attempt} failed for ${p}: ${err}`);
      if (attempt === 4) throw err;
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
}

function trimSet(s) {
  return {
    id: s.id,
    name: s.name,
    series: s.series,
    printedTotal: s.printedTotal,
    total: s.total,
    releaseDate: s.releaseDate,
    symbolUrl: s.images?.symbol ?? "",
    logoUrl: s.images?.logo ?? "",
  };
}

// Variant derivation mirrors lib/tcg/variants.ts so fixtures look exactly like
// PokemonTcgIoSource output.
function deriveVariants(prices, ctx) {
  const keys = prices ? Object.keys(prices) : [];
  if (keys.length > 0) {
    return {
      normal: keys.some((k) => k === "normal" || k.startsWith("unlimited") || k.startsWith("1stEdition")),
      reverse: keys.includes("reverseHolofoil"),
      holo: keys.some((k) => k.toLowerCase().includes("holofoil") && k !== "reverseHolofoil"),
    };
  }
  const year = Number.parseInt(ctx.releaseDate.slice(0, 4), 10);
  const m = /^([A-Za-z]*)(\d+)([a-z]*)$/.exec(ctx.number);
  const numeric = m ? Number.parseInt(m[2], 10) : Number.NaN;
  const plainMain = m !== null && m[1] === "" && numeric <= ctx.printedTotal;
  return {
    normal: true,
    reverse: year >= 2002 && plainMain && ["Common", "Uncommon", "Rare", "Rare Holo"].includes(ctx.rarity ?? ""),
    holo: (ctx.rarity ?? "").includes("Holo"),
  };
}

// Mirrors mapTcgPlayer in lib/tcg/pokemontcgio.ts.
function trimTcgPlayer(raw) {
  if (!raw) return undefined;
  const prices = {};
  for (const [variant, fields] of Object.entries(raw.prices ?? {})) {
    const range = {};
    for (const field of ["low", "mid", "high", "market", "directLow"]) {
      if (typeof fields?.[field] === "number") range[field] = fields[field];
    }
    prices[variant] = range;
  }
  return {
    url: raw.url,
    updatedAt: raw.updatedAt,
    prices: Object.keys(prices).length > 0 ? prices : undefined,
  };
}

function trimCard(c) {
  return {
    id: c.id,
    name: c.name,
    number: c.number,
    rarity: c.rarity,
    supertype: c.supertype ?? "Unknown",
    imageSmall: c.images?.small ?? "",
    imageLarge: c.images?.large ?? "",
    variants: deriveVariants(c.tcgplayer?.prices, {
      releaseDate: c.set.releaseDate,
      printedTotal: c.set.printedTotal,
      number: c.number,
      rarity: c.rarity,
    }),
    tcgplayer: trimTcgPlayer(c.tcgplayer),
  };
}

await mkdir(OUT, { recursive: true });

console.log("fetching sets…");
const sets = [];
for (let page = 1; ; page++) {
  const body = await get(`/sets?pageSize=250&page=${page}&orderBy=releaseDate`);
  sets.push(...body.data.map(trimSet));
  if (sets.length >= body.totalCount || body.data.length === 0) break;
}
await writeFile(path.join(OUT, "sets.json"), JSON.stringify(sets, null, 1));
console.log(`sets.json: ${sets.length} sets`);

for (const setId of CARD_SETS) {
  console.log(`fetching cards for ${setId}…`);
  const cards = [];
  for (let page = 1; ; page++) {
    const body = await get(`/cards?q=${encodeURIComponent(`set.id:${setId}`)}&pageSize=250&page=${page}&orderBy=number`);
    cards.push(...body.data.map(trimCard));
    if (cards.length >= body.totalCount || body.data.length === 0) break;
  }
  await writeFile(path.join(OUT, `cards-${setId}.json`), JSON.stringify(cards, null, 1));
  console.log(`cards-${setId}.json: ${cards.length} cards`);
}
console.log("done");
