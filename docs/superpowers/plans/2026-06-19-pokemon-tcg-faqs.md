# Pokémon TCG per-set FAQ section (`/faqs`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/faqs` section: ~300 individual, data-backed FAQ pages (one question about one of the 20 newest sets each), a blog-style index, `FAQPage`+`BreadcrumbList` schema, and a dense internal-link mesh.

**Architecture:** A manual generator script reads the cache DB and writes a small committed JSON snapshot (`lib/content/faqs/data.json`). A pure TS registry runs typed per-question templates over that snapshot to produce `FAQ_PAGES`. Routes render from `FAQ_PAGES` — no DB/API at request time, so builds stay hermetic (fixture mode only caches 2 sets). Authoritative figures (master-set slot count, rarity rank, binder page math) reuse the app's own `lib/layout`, `lib/tcg/rarity`, `lib/binders`.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, TypeScript, `node:sqlite`, `marked`, vitest, Tailwind v4, the app's GB-styled components.

**Spec:** `docs/superpowers/specs/2026-06-19-pokemon-tcg-faqs-design.md`

**Conventions to mirror:** `lib/content/articles.ts` + `app/facts/*` (content), `lib/structured-data.ts` + `components/json-ld.tsx` (schema), `lib/i18n/dictionaries/*` (footer copy).

**Reference figures (from the cache DB, June 2026), used in test assertions:**
- 20 newest sets, newest first: me4, me3, me2pt5, me2, me1, rsv10pt5, zsv10pt5, sv10, sv9, sv8pt5, sv8, sv7, sv6pt5, sv6, sv5, sv4pt5, sv4, sv3pt5, sv3, sv2.
- Sets with **no** TCGplayer prices (no `valuable-card` page): me4, me3, me2pt5.
- Sets with ball patterns (`ball-patterns` page): sv8pt5, zsv10pt5, rsv10pt5.
- Prismatic Evolutions (sv8pt5): printedTotal 131, total 180, reverse 100, pokeball 100, masterball 67, **master-set slots 447**, rarest = a Hyper Rare, most valuable = Umbreon ex #161.

---

## Task 0: Branch

- [ ] **Step 1: Create a feature branch**

Run:
```bash
cd /Users/johnslater/bindermon
git status --short && git checkout -b feat/pokemon-tcg-faqs
```
Expected: switched to a new branch (working tree should be clean apart from the committed spec + this plan).

---

## Task 1: Pure compute module + guard test

The generator must reproduce the app's authoritative numbers. Factor the pure logic into an ESM module that both the generator and a vitest guard test import; the guard test compares it to the **real** `expandSlots` / `rarityRank` on committed fixtures so it can never silently drift.

**Files:**
- Create: `scripts/faq-compute.mjs`
- Test: `test/unit/faqs-compute.test.ts`

- [ ] **Step 1: Write the failing test**

`test/unit/faqs-compute.test.ts`:
```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { rarityRank } from "@/lib/tcg/rarity";
import { expandSlots } from "@/lib/layout";
import {
  masterSlotCount,
  rarestOf,
  marketPriceOf,
  mostValuableOf,
  chaseOf,
  marqueePokemonOf,
  RARITY_ORDER,
} from "../../scripts/faq-compute.mjs";

function fixture(setId: string) {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), "test", "fixtures", `cards-${setId}.json`), "utf8"),
  );
}

describe("faq-compute matches the app's authoritative logic", () => {
  it("master slot count equals expandSlots master-mode length (sv8pt5, has ball patterns)", () => {
    const cards = fixture("sv8pt5");
    const real = expandSlots(cards, {
      mode: "master",
      includeSecrets: true,
      includePokeball: true,
      includeMasterball: true,
      placement: "interleave",
      printedTotal: 131,
    }).length;
    expect(masterSlotCount(cards)).toBe(real);
    expect(masterSlotCount(cards)).toBe(447);
  });

  it("RARITY_ORDER ranks identically to the app's rarityRank", () => {
    for (const name of RARITY_ORDER) {
      const local = RARITY_ORDER.indexOf(name) + 1;
      expect(local).toBe(rarityRank(name));
    }
  });

  it("rarest card has the highest rarity rank in the set", () => {
    const cards = fixture("sv8pt5");
    const rarest = rarestOf(cards);
    const maxRank = Math.max(...cards.map((c: any) => rarityRank(c.rarity)));
    expect(rarityRank(rarest.rarity)).toBe(maxRank);
  });

  it("most valuable card is the highest market price (Umbreon ex #161 in sv8pt5)", () => {
    const valuable = mostValuableOf(fixture("sv8pt5"));
    expect(valuable?.number).toBe("161");
    expect(valuable?.name).toMatch(/Umbreon/);
  });

  it("marketPriceOf returns undefined when a card has no prices", () => {
    expect(marketPriceOf({ tcgplayer: undefined } as any)).toBeUndefined();
  });

  it("marquee Pokémon are deduped by base species and capped", () => {
    const marquee = marqueePokemonOf(fixture("sv8pt5"), 5);
    expect(marquee.length).toBeLessThanOrEqual(5);
    const slugs = marquee.map((m: any) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(marquee.every((m: any) => m.cards.length >= 1)).toBe(true);
  });

  it("chaseOf returns distinct cards ranked by rarity", () => {
    const chase = chaseOf(fixture("sv8pt5"), 6);
    expect(chase.length).toBe(6);
    expect(new Set(chase.map((c: any) => c.id)).size).toBe(6);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run test/unit/faqs-compute.test.ts`
Expected: FAIL — cannot resolve `../../scripts/faq-compute.mjs`.

- [ ] **Step 3: Implement `scripts/faq-compute.mjs`**

```js
// Pure, dependency-free Pokémon TCG fact computation shared by the FAQ
// snapshot generator (scripts/build-faqs.mjs) and its guard test
// (test/unit/faqs-compute.test.ts). No DB, no @/ imports — so it runs both
// under plain `node` and under vitest. Guarded against the app's real
// expandSlots / rarityRank by the test, so it can't drift silently.

// Mirror of lib/tcg/rarity.ts ORDER (commonest → rarest). The guard test
// asserts this stays identical to the app's rarityRank.
export const RARITY_ORDER = [
  "Common", "Uncommon", "Rare", "Rare Holo", "Promo", "Rare Holo EX",
  "Rare Holo GX", "Rare Holo V", "Rare Holo VMAX", "Rare Holo VSTAR",
  "Double Rare", "Rare BREAK", "Rare Prime", "Rare Prism Star", "Rare ACE",
  "ACE SPEC Rare", "Rare Ultra", "Ultra Rare", "Rare Shiny", "Shiny Rare",
  "Rare Shiny GX", "Shiny Ultra Rare", "Radiant Rare", "Amazing Rare",
  "Illustration Rare", "Trainer Gallery Rare Holo", "Rare Secret",
  "Rare Rainbow", "Special Illustration Rare", "Rare Shining", "LEGEND",
  "Hyper Rare",
];
const RANK = new Map(RARITY_ORDER.map((n, i) => [n.toLowerCase(), i + 1]));
const UNKNOWN_RANK = 5;
export function rarityRank(rarity) {
  if (!rarity) return 0;
  return RANK.get(String(rarity).toLowerCase()) ?? UNKNOWN_RANK;
}

const ILLUSTRATION_RARITIES = new Set(["illustration rare", "special illustration rare"]);
const EVERGREEN = new Set([
  "charizard", "pikachu", "eevee", "mewtwo", "umbreon", "gengar", "lucario", "rayquaza", "mew",
]);
const DOUBLE_RARE_RANK = rarityRank("Double Rare"); // marquee/chase threshold

/** Highest market value across a card's print variants; undefined if unpriced. */
export function marketPriceOf(card) {
  const prices = card?.tcgplayer?.prices;
  if (!prices) return undefined;
  let best;
  for (const range of Object.values(prices)) {
    const v = range.market ?? range.high ?? range.mid ?? range.low;
    if (typeof v === "number" && (best === undefined || v > best)) best = v;
  }
  return best;
}

/** Trailing integer of a collector number ("145" → 145, "TG01" → 1, "SV001" → 1). */
function numberValue(number) {
  const m = String(number).match(/(\d+)\s*$/);
  return m ? Number(m[1]) : 0;
}

export function cardRef(card) {
  const ref = { id: card.id, name: card.name, number: card.number, rarity: card.rarity };
  const price = marketPriceOf(card);
  if (typeof price === "number") ref.marketPrice = price;
  return ref;
}

export function masterSlotCount(cards) {
  // Mirrors lib/layout/expand.ts master mode: 1 card slot + reverse + pokeball
  // + masterball per card, secrets included (the app's default master config).
  let n = 0;
  for (const c of cards) {
    const v = c.variants ?? {};
    n += 1;
    if (v.reverse) n += 1;
    if (v.pokeball) n += 1;
    if (v.masterball) n += 1;
  }
  return n;
}

export function reverseHoloCount(cards) {
  return cards.filter((c) => c.variants?.reverse).length;
}
export function ballCounts(cards) {
  return {
    pokeball: cards.filter((c) => c.variants?.pokeball).length,
    masterball: cards.filter((c) => c.variants?.masterball).length,
  };
}
export function supertypeCounts(cards) {
  const out = { pokemon: 0, trainer: 0, energy: 0 };
  for (const c of cards) {
    if (c.supertype === "Pokémon") out.pokemon += 1;
    else if (c.supertype === "Trainer") out.trainer += 1;
    else if (c.supertype === "Energy") out.energy += 1;
  }
  return out;
}
export function illustrationRareCount(cards) {
  return cards.filter((c) => ILLUSTRATION_RARITIES.has(String(c.rarity ?? "").toLowerCase())).length;
}
export function rarityHistogram(cards) {
  const out = {};
  for (const c of cards) {
    const key = c.rarity ?? "(unlisted)";
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

/** Rarest by rank; ties broken by higher collector number, then market price. */
export function rarestOf(cards) {
  const best = [...cards].sort((a, b) => {
    const r = rarityRank(b.rarity) - rarityRank(a.rarity);
    if (r) return r;
    const n = numberValue(b.number) - numberValue(a.number);
    if (n) return n;
    return (marketPriceOf(b) ?? 0) - (marketPriceOf(a) ?? 0);
  })[0];
  return cardRef(best);
}

/** Highest market price; undefined when the set has no priced cards. */
export function mostValuableOf(cards) {
  let best, bestPrice = -1;
  for (const c of cards) {
    const p = marketPriceOf(c);
    if (typeof p === "number" && p > bestPrice) { bestPrice = p; best = c; }
  }
  return best ? cardRef(best) : undefined;
}

/** Top n chase cards by (rarity rank, price); distinct; Pokémon preferred on ties. */
export function chaseOf(cards, n = 6) {
  return [...cards]
    .sort((a, b) => {
      const r = rarityRank(b.rarity) - rarityRank(a.rarity);
      if (r) return r;
      const p = (marketPriceOf(b) ?? 0) - (marketPriceOf(a) ?? 0);
      if (p) return p;
      return (b.supertype === "Pokémon" ? 1 : 0) - (a.supertype === "Pokémon" ? 1 : 0);
    })
    .slice(0, n)
    .map(cardRef);
}

export function baseSpecies(name) {
  return String(name).replace(/\s+(ex|EX|V|VMAX|VSTAR|VMAX|GX|LV\.?X)\b.*$/, "").trim();
}
export function speciesSlug(name) {
  return baseSpecies(name).toLowerCase().replace(/['.]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Marquee/chase Pokémon for a set: chase-rarity Pokémon grouped by base
 *  species, ranked by their best card (rarity, price) with an evergreen nudge,
 *  capped at `cap`. Each entry lists every print of that species in the set. */
export function marqueePokemonOf(cards, cap = 5) {
  const groups = new Map();
  for (const c of cards) {
    if (c.supertype !== "Pokémon") continue;
    if (rarityRank(c.rarity) < DOUBLE_RARE_RANK) continue;
    const species = baseSpecies(c.name);
    const slug = speciesSlug(c.name);
    if (!groups.has(slug)) groups.set(slug, { slug, displayName: species, cards: [] });
    groups.get(slug).cards.push(c);
  }
  const score = (g) => {
    const top = Math.max(...g.cards.map((c) => rarityRank(c.rarity)));
    const price = Math.max(...g.cards.map((c) => marketPriceOf(c) ?? 0));
    const evergreen = EVERGREEN.has(g.slug.split("-")[0]) ? 1000 : 0;
    return top * 100000 + evergreen + price;
  };
  return [...groups.values()]
    .sort((a, b) => score(b) - score(a))
    .slice(0, cap)
    .map((g) => ({
      slug: g.slug,
      displayName: g.displayName,
      // List every print of the species, lowest collector number first.
      cards: g.cards.sort((a, b) => numberValue(a.number) - numberValue(b.number)).map(cardRef),
    }));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run test/unit/faqs-compute.test.ts`
Expected: PASS (7 tests). If `masterSlotCount` ≠ `expandSlots` length, the cached/fixture ball flags differ — stop and reconcile before continuing.

- [ ] **Step 5: Commit**

```bash
git add scripts/faq-compute.mjs test/unit/faqs-compute.test.ts
git commit -m "feat(faqs): pure fact-compute module guarded against app logic"
```

---

## Task 2: Snapshot + page types

**Files:**
- Create: `lib/content/faqs/types.ts`

- [ ] **Step 1: Write the types**

`lib/content/faqs/types.ts`:
```ts
/** A reference to a specific card, used in answers and links. */
export type FaqCardRef = {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  /** Highest TCGplayer market value across variants, when priced. */
  marketPrice?: number;
};

export type FaqPokemon = {
  /** Species slug for the URL and /pokemon binder link (e.g. "umbreon"). */
  slug: string;
  /** Display species name (e.g. "Umbreon"). */
  displayName: string;
  /** Every print of the species in the set, lowest number first. */
  cards: FaqCardRef[];
};

/** All the figures one set contributes to its FAQ pages. */
export type FaqSetFacts = {
  id: string;
  name: string;
  slug: string;
  series: string;
  releaseDate: string; // YYYY/MM/DD
  printedTotal: number;
  total: number;
  secretCount: number;
  pokemonCount: number;
  trainerCount: number;
  energyCount: number;
  reverseHoloCount: number;
  masterSetCount: number;
  pokeballCount: number;
  masterballCount: number;
  hasBallPatterns: boolean;
  illustrationRareCount: number;
  rarityHistogram: Record<string, number>;
  rarestCard: FaqCardRef;
  mostValuableCard?: FaqCardRef; // absent when the set has no price data
  chaseCards: FaqCardRef[];
  marqueePokemon: FaqPokemon[];
  /** 1 = largest printedTotal among the 20 sets in scope. */
  sizeRankAmongRecent: number;
};

export type FaqSnapshot = {
  asOf: string;
  sets: FaqSetFacts[];
};

export type FaqType =
  | "card-count"
  | "master-set"
  | "binder-size"
  | "rarest-card"
  | "valuable-card"
  | "chase-cards"
  | "secret-rares"
  | "illustration-rares"
  | "reverse-holos"
  | "release-date"
  | "ball-patterns"
  | "pokemon-in-set";

/** A single rendered FAQ page. */
export type FaqPage = {
  slug: string;
  type: FaqType;
  setId: string;
  /** Visible <h1> AND schema Question.name. */
  question: string;
  /** <title>. */
  title: string;
  /** Meta description AND the direct answer mirrored verbatim as page text and
   *  schema acceptedAnswer. */
  description: string;
  /** Markdown body (no H1). */
  body: string;
  /** Contextual CTAs + cross-question links (app routes + other FAQ slugs). */
  related: { href: string; label: string }[];
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS (no references yet; this just confirms the file compiles).

- [ ] **Step 3: Commit**

```bash
git add lib/content/faqs/types.ts
git commit -m "feat(faqs): snapshot and page types"
```

---

## Task 3: Snapshot generator + committed `data.json`

**Files:**
- Create: `scripts/build-faqs.mjs`
- Create (generated): `lib/content/faqs/data.json`
- Test: `test/unit/faqs-snapshot.test.ts`

- [ ] **Step 1: Implement the generator**

`scripts/build-faqs.mjs`:
```js
// Regenerates lib/content/faqs/data.json from the cache DB. Run manually after
// new sets land: `node scripts/build-faqs.mjs`. Reads the same SQLite cache the
// app uses; never run in CI (the DB is local-only). Figures are snapshotted so
// builds/tests stay hermetic. Master-set + selection logic is in faq-compute.mjs
// (guarded against the app's real logic by test/unit/faqs-compute.test.ts).
import { DatabaseSync } from "node:sqlite";
import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  cardRef, masterSlotCount, reverseHoloCount, ballCounts, supertypeCounts,
  illustrationRareCount, rarityHistogram, rarestOf, mostValuableOf, chaseOf,
  marqueePokemonOf,
} from "./faq-compute.mjs";

const POKEMON_PER_SET = 5;
const AS_OF = "June 2026";
const SET_COUNT = 20;

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
const sets = [...allSets].sort((a, b) => (a.releaseDate < b.releaseDate ? 1 : -1)).slice(0, SET_COUNT);

// Size rank (largest printedTotal = 1) across the 20 in scope.
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
```

- [ ] **Step 2: Generate the snapshot**

Run: `node scripts/build-faqs.mjs`
Expected: `wrote 20 sets → .../lib/content/faqs/data.json`. Inspect: `node -e "const d=require('./lib/content/faqs/data.json'); console.log(d.sets.length, d.sets[9].name, d.sets[9].masterSetCount, d.sets[9].mostValuableCard?.name)"` → `20 Prismatic Evolutions 447 Umbreon ex`.

- [ ] **Step 3: Write the snapshot integrity test**

`test/unit/faqs-snapshot.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import snapshot from "@/lib/content/faqs/data.json";
import type { FaqSnapshot } from "@/lib/content/faqs/types";

const snap = snapshot as FaqSnapshot;
const PRICELESS = new Set(["me4", "me3", "me2pt5"]);
const BALL_SETS = new Set(["sv8pt5", "zsv10pt5", "rsv10pt5"]);

describe("faq snapshot", () => {
  it("has exactly 20 sets, newest first", () => {
    expect(snap.sets).toHaveLength(20);
    for (let i = 1; i < snap.sets.length; i++) {
      expect(snap.sets[i - 1].releaseDate >= snap.sets[i].releaseDate).toBe(true);
    }
  });

  it("every set has sane counts and a rarest card", () => {
    for (const s of snap.sets) {
      expect(s.printedTotal).toBeGreaterThan(0);
      expect(s.total).toBeGreaterThanOrEqual(s.printedTotal);
      expect(s.secretCount).toBe(Math.max(0, s.total - s.printedTotal));
      expect(s.masterSetCount).toBeGreaterThanOrEqual(s.total);
      expect(s.rarestCard?.id).toBeTruthy();
      expect(s.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("only priced sets carry a most-valuable card", () => {
    for (const s of snap.sets) {
      if (PRICELESS.has(s.id)) expect(s.mostValuableCard).toBeUndefined();
      else expect(s.mostValuableCard?.id).toBeTruthy();
    }
  });

  it("flags ball-pattern sets correctly", () => {
    for (const s of snap.sets) expect(s.hasBallPatterns).toBe(BALL_SETS.has(s.id));
  });

  it("caps marquee Pokémon at 5 with unique slugs", () => {
    for (const s of snap.sets) {
      expect(s.marqueePokemon.length).toBeLessThanOrEqual(5);
      const slugs = s.marqueePokemon.map((p) => p.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });
});
```

- [ ] **Step 4: Run the test**

Run: `pnpm vitest run test/unit/faqs-snapshot.test.ts`
Expected: PASS (5 tests). `tsconfig`/vitest resolve JSON imports by default (`resolveJsonModule` is on in Next TS configs).

- [ ] **Step 5: Commit (include the generated data)**

```bash
git add scripts/build-faqs.mjs lib/content/faqs/data.json test/unit/faqs-snapshot.test.ts
git commit -m "feat(faqs): snapshot generator + committed data.json"
```

---

## Task 4: Slug + grammar helpers

**Files:**
- Create: `lib/content/faqs/slug.ts`
- Test: `test/unit/faqs-slug.test.ts`

- [ ] **Step 1: Write the failing test**

`test/unit/faqs-slug.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { indefiniteArticle, pokemonInSetSlug } from "@/lib/content/faqs/slug";

describe("faq slug helpers", () => {
  it("chooses a/an by leading vowel sound", () => {
    expect(indefiniteArticle("Charizard")).toBe("a");
    expect(indefiniteArticle("Umbreon")).toBe("an");
    expect(indefiniteArticle("Eevee")).toBe("an");
  });

  it("builds a deterministic pokemon-in-set slug", () => {
    expect(pokemonInSetSlug("umbreon", "prismatic-evolutions")).toBe(
      "is-there-an-umbreon-card-in-prismatic-evolutions",
    );
    expect(pokemonInSetSlug("charizard", "151")).toBe("is-there-a-charizard-card-in-151");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run test/unit/faqs-slug.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/content/faqs/slug.ts`**

```ts
import type { FaqType } from "@/lib/content/faqs/types";

/** "a" or "an" for a display name, by leading vowel. */
export function indefiniteArticle(name: string): "a" | "an" {
  return /^[aeiou]/i.test(name.trim()) ? "an" : "a";
}

/** Slug for the "Is there a [Pokémon] card in [Set]?" page. The article is part
 *  of the slug so it reads naturally, derived deterministically from the name. */
export function pokemonInSetSlug(pokemonSlug: string, setSlug: string): string {
  const display = pokemonSlug.replace(/-/g, " ");
  return `is-there-${indefiniteArticle(display)}-${pokemonSlug}-card-in-${setSlug}`;
}

/** Slug for a set-level FAQ of a given type. */
export function setFaqSlug(type: Exclude<FaqType, "pokemon-in-set">, setSlug: string): string {
  switch (type) {
    case "card-count": return `how-many-cards-in-${setSlug}`;
    case "master-set": return `how-many-cards-in-${setSlug}-master-set`;
    case "binder-size": return `best-binder-size-for-${setSlug}`;
    case "rarest-card": return `rarest-card-in-${setSlug}`;
    case "valuable-card": return `most-valuable-card-in-${setSlug}`;
    case "chase-cards": return `chase-cards-in-${setSlug}`;
    case "secret-rares": return `how-many-secret-rares-in-${setSlug}`;
    case "illustration-rares": return `how-many-illustration-rares-in-${setSlug}`;
    case "reverse-holos": return `how-many-reverse-holos-in-${setSlug}`;
    case "release-date": return `when-did-${setSlug}-come-out`;
    case "ball-patterns": return `does-${setSlug}-have-ball-pattern-cards`;
  }
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm vitest run test/unit/faqs-slug.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/content/faqs/slug.ts test/unit/faqs-slug.test.ts
git commit -m "feat(faqs): slug and grammar helpers"
```

---

## Task 5: Shared formatting + link helpers

**Files:**
- Create: `lib/content/faqs/format.ts`
- Test: `test/unit/faqs-format.test.ts`

- [ ] **Step 1: Write the failing test**

`test/unit/faqs-format.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { num, money, pocketTable, cardLabel } from "@/lib/content/faqs/format";

describe("faq formatting helpers", () => {
  it("formats integers with thousands separators", () => {
    expect(num(20359)).toBe("20,359");
    expect(num(447)).toBe("447");
  });
  it("formats USD money", () => {
    expect(money(1579.6)).toBe("$1,579.60");
    expect(money(80)).toBe("$80.00");
  });
  it("builds a markdown pocket table for a slot count", () => {
    const md = pocketTable(131);
    expect(md).toContain("9-pocket");
    expect(md).toMatch(/\| *Pages *\|/);
  });
  it("labels a card as name + number", () => {
    expect(cardLabel({ id: "x", name: "Umbreon ex", number: "161" })).toBe("Umbreon ex (#161)");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run test/unit/faqs-format.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/content/faqs/format.ts`**

```ts
import { evaluatePresets, recommendPreset } from "@/lib/binders";
import type { FaqCardRef } from "@/lib/content/faqs/types";

export function num(n: number): string {
  return n.toLocaleString("en-US");
}

export function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function cardLabel(card: Pick<FaqCardRef, "name" | "number">): string {
  return `${card.name} (#${card.number})`;
}

/** A small Markdown table of pages needed per pocket size for a slot count. */
export function pocketTable(slots: number): string {
  const rows = evaluatePresets(slots).map(
    (p) => `| ${p.pockets}-pocket | ${p.pages} |`,
  );
  return ["| Binder | Pages |", "| --- | --- |", ...rows].join("\n");
}

/** Plain-English recommendation sentence for a slot count. */
export function recommendSentence(slots: number, label: string): string {
  const r = recommendPreset(slots);
  return (
    `For ${label} you'll want a **${r.pockets}-pocket binder**: that's ${r.pages} ` +
    `pages${r.binders > 1 ? ` across ${r.binders} binders` : ""}.`
  );
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm vitest run test/unit/faqs-format.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/content/faqs/format.ts test/unit/faqs-format.test.ts
git commit -m "feat(faqs): formatting and binder-math helpers"
```

---

## Task 6: Count-style templates (card-count, master-set, secret-rares, illustration-rares, reverse-holos)

These five share a shape: a headline number + context + cross-links. One file, one function each, returning a `FaqPage`.

**Files:**
- Create: `lib/content/faqs/templates/counts.ts`

- [ ] **Step 1: Implement the count templates**

`lib/content/faqs/templates/counts.ts`:
```ts
import type { FaqPage, FaqSetFacts } from "@/lib/content/faqs/types";
import { setFaqSlug } from "@/lib/content/faqs/slug";
import { num, cardLabel } from "@/lib/content/faqs/format";

const SITE_FIGURES_NOTE = "Figures are from the pokemontcg.io dataset, as of June 2026.";

export function cardCountPage(s: FaqSetFacts): FaqPage {
  const slug = setFaqSlug("card-count", s.slug);
  const description =
    `${s.name} has ${num(s.printedTotal)} cards in the main set, or ${num(s.total)} ` +
    `including its ${num(s.secretCount)} secret rares.`;
  const body = [
    `**${description}**`,
    "",
    `That ${num(s.printedTotal)}-card base set breaks down into ${num(s.pokemonCount)} ` +
      `Pokémon, ${num(s.trainerCount)} Trainers and ${num(s.energyCount)} Energy. ` +
      `Numbers above ${s.printedTotal} are the secret rares — the "chase" cards numbered ` +
      `beyond the printed total.`,
    "",
    `Among the 20 most recent sets, ${s.name} ranks **#${s.sizeRankAmongRecent} by size**. ` +
      `If you're chasing a full master set (every reverse holo and parallel too), that count ` +
      `climbs to ${num(s.masterSetCount)} cards.`,
    "",
    SITE_FIGURES_NOTE,
  ].join("\n");
  return {
    slug, type: "card-count", setId: s.id,
    question: `How many cards are in ${s.name}?`,
    title: `How many cards are in ${s.name}? (${s.printedTotal}-card set)`,
    description, body,
    related: [
      { href: `/set/${s.id}`, label: `See every ${s.name} card` },
      { href: setFaqSlug("master-set", s.slug), label: `${s.name} master set size` },
      { href: setFaqSlug("secret-rares", s.slug), label: `Secret rares in ${s.name}` },
      { href: `/build?set=${s.id}`, label: `Plan a ${s.name} binder` },
    ],
  };
}

export function masterSetPage(s: FaqSetFacts): FaqPage {
  const slug = setFaqSlug("master-set", s.slug);
  const description =
    `A ${s.name} master set is ${num(s.masterSetCount)} cards — every card plus its ` +
    `${num(s.reverseHoloCount)} reverse holos${s.hasBallPatterns ? " and Poké Ball / Master Ball patterns" : ""}.`;
  const body = [
    `**${description}**`,
    "",
    `A master set means one of everything: each of the ${num(s.total)} cards, every reverse ` +
      `holo (${num(s.reverseHoloCount)} of them)${s.hasBallPatterns
        ? `, plus the ${num(s.pokeballCount)} Poké Ball and ${num(s.masterballCount)} Master Ball mirror cards unique to this set`
        : ""}. Add it up and you're sleeving **${num(s.masterSetCount)} cards** — versus ${num(s.printedTotal)} for the base set.`,
    "",
    `That's roughly ${(s.masterSetCount / s.printedTotal).toFixed(1)}× the base set, so plan your ` +
      `binder space accordingly.`,
    "",
    SITE_FIGURES_NOTE,
  ].join("\n");
  return {
    slug, type: "master-set", setId: s.id,
    question: `How many cards are in a ${s.name} master set?`,
    title: `How many cards are in a ${s.name} master set? (${s.masterSetCount})`,
    description, body,
    related: [
      { href: setFaqSlug("binder-size", s.slug), label: `Best binder size for ${s.name}` },
      { href: setFaqSlug("reverse-holos", s.slug), label: `Reverse holos in ${s.name}` },
      ...(s.hasBallPatterns ? [{ href: setFaqSlug("ball-patterns", s.slug), label: `${s.name} ball patterns` }] : []),
      { href: `/build?set=${s.id}&mode=master`, label: `Build the ${s.name} master set` },
    ],
  };
}

export function secretRaresPage(s: FaqSetFacts): FaqPage {
  const slug = setFaqSlug("secret-rares", s.slug);
  const description =
    `${s.name} has ${num(s.secretCount)} secret rares — cards numbered above ${s.printedTotal}.`;
  const body = [
    `**${description}**`,
    "",
    `Secret rares are the cards numbered beyond the printed total of ${s.printedTotal} — so in ` +
      `${s.name}, anything from #${s.printedTotal + 1} to #${s.total}. They're the hardest pulls ` +
      `and usually the priciest cards in the set.`,
    "",
    `The rarest of the lot is ${cardLabel(s.rarestCard)}${s.rarestCard.rarity ? `, a ${s.rarestCard.rarity}` : ""}.`,
    "",
    SITE_FIGURES_NOTE,
  ].join("\n");
  return {
    slug, type: "secret-rares", setId: s.id,
    question: `How many secret rares are in ${s.name}?`,
    title: `How many secret rares are in ${s.name}? (${s.secretCount})`,
    description, body,
    related: [
      { href: setFaqSlug("rarest-card", s.slug), label: `Rarest card in ${s.name}` },
      { href: setFaqSlug("chase-cards", s.slug), label: `${s.name} chase cards` },
      { href: setFaqSlug("illustration-rares", s.slug), label: `Illustration Rares in ${s.name}` },
      { href: `/set/${s.id}`, label: `Browse ${s.name}` },
    ],
  };
}

export function illustrationRaresPage(s: FaqSetFacts): FaqPage {
  const slug = setFaqSlug("illustration-rares", s.slug);
  const description =
    `${s.name} has ${num(s.illustrationRareCount)} Illustration Rares and Special Illustration Rares.`;
  const body = [
    `**${description}**`,
    "",
    `Illustration Rares (IR) and Special Illustration Rares (SIR) are the full-art, ` +
      `scene-style cards collectors chase hardest. ${s.name} packs ${num(s.illustrationRareCount)} ` +
      `of them into its ${num(s.total)} cards.`,
    "",
    `They're a big chunk of why a ${s.name} master set runs to ${num(s.masterSetCount)} cards.`,
    "",
    SITE_FIGURES_NOTE,
  ].join("\n");
  return {
    slug, type: "illustration-rares", setId: s.id,
    question: `How many Illustration Rares are in ${s.name}?`,
    title: `How many Illustration Rares are in ${s.name}?`,
    description, body,
    related: [
      { href: setFaqSlug("chase-cards", s.slug), label: `${s.name} chase cards` },
      { href: setFaqSlug("rarest-card", s.slug), label: `Rarest card in ${s.name}` },
      { href: `/set/${s.id}`, label: `Browse ${s.name}` },
    ],
  };
}

export function reverseHolosPage(s: FaqSetFacts): FaqPage {
  const slug = setFaqSlug("reverse-holos", s.slug);
  const description = `${s.name} has ${num(s.reverseHoloCount)} cards with a reverse holo version.`;
  const body = [
    `**${description}**`,
    "",
    `Reverse holos foil the card body instead of the artwork, and most commons, uncommons ` +
      `and non-holo rares get one. In ${s.name} that's ${num(s.reverseHoloCount)} extra cards to ` +
      `track for a master set.`,
    "",
    `Counting reverse holos${s.hasBallPatterns ? " and ball patterns" : ""}, a full ${s.name} ` +
      `master set is ${num(s.masterSetCount)} cards.`,
    "",
    SITE_FIGURES_NOTE,
  ].join("\n");
  return {
    slug, type: "reverse-holos", setId: s.id,
    question: `How many reverse holo cards are in ${s.name}?`,
    title: `How many reverse holo cards are in ${s.name}?`,
    description, body,
    related: [
      { href: setFaqSlug("master-set", s.slug), label: `${s.name} master set size` },
      { href: setFaqSlug("binder-size", s.slug), label: `Best binder size for ${s.name}` },
      { href: `/build?set=${s.id}&mode=master`, label: `Build the ${s.name} master set` },
    ],
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/content/faqs/templates/counts.ts
git commit -m "feat(faqs): count-style page templates"
```

---

## Task 7: Card-spotlight templates (rarest-card, valuable-card, chase-cards) + binder-size + release-date + ball-patterns

**Files:**
- Create: `lib/content/faqs/templates/cards.ts`
- Create: `lib/content/faqs/templates/sets.ts`

- [ ] **Step 1: Implement the card-spotlight templates**

`lib/content/faqs/templates/cards.ts`:
```ts
import type { FaqPage, FaqSetFacts } from "@/lib/content/faqs/types";
import { setFaqSlug } from "@/lib/content/faqs/slug";
import { money, cardLabel } from "@/lib/content/faqs/format";

const NOTE = "Figures are from the pokemontcg.io dataset (TCGplayer pricing), as of June 2026.";

export function rarestCardPage(s: FaqSetFacts): FaqPage {
  const c = s.rarestCard;
  const slug = setFaqSlug("rarest-card", s.slug);
  const description =
    `The rarest card in ${s.name} is ${cardLabel(c)}${c.rarity ? `, a ${c.rarity}` : ""}.`;
  const valuableLine =
    s.mostValuableCard && s.mostValuableCard.id !== c.id
      ? `Rarity and price don't always line up — by market value, the priciest card is ` +
        `${cardLabel(s.mostValuableCard)}.`
      : "It's also the set's headline chase card.";
  const body = [
    `**${description}**`,
    "",
    `${c.name} sits at the top of ${s.name}'s rarity ladder${c.rarity ? ` as a ${c.rarity}` : ""}, ` +
      `numbered #${c.number}. ${valuableLine}`,
    "",
    NOTE,
  ].join("\n");
  return {
    slug, type: "rarest-card", setId: s.id,
    question: `What is the rarest card in ${s.name}?`,
    title: `What is the rarest card in ${s.name}?`,
    description, body,
    related: [
      { href: `/card/${c.id}`, label: `View ${c.name}` },
      ...(s.mostValuableCard ? [{ href: setFaqSlug("valuable-card", s.slug), label: `Most valuable ${s.name} card` }] : []),
      { href: setFaqSlug("chase-cards", s.slug), label: `${s.name} chase cards` },
      { href: setFaqSlug("secret-rares", s.slug), label: `Secret rares in ${s.name}` },
    ],
  };
}

/** Only call when s.mostValuableCard is defined. */
export function valuableCardPage(s: FaqSetFacts): FaqPage {
  const c = s.mostValuableCard!;
  const slug = setFaqSlug("valuable-card", s.slug);
  const priceText = typeof c.marketPrice === "number" ? ` at about ${money(c.marketPrice)}` : "";
  const description = `The most valuable card in ${s.name} is ${cardLabel(c)}${priceText}.`;
  const body = [
    `**${description}**`,
    "",
    `${c.name} (#${c.number}${c.rarity ? `, ${c.rarity}` : ""}) tops ${s.name} on the secondary ` +
      `market${priceText ? `, trading around ${money(c.marketPrice!)}` : ""}. Prices move constantly — ` +
      `treat this as a snapshot, not a quote.`,
    "",
    `It isn't always the *rarest* card by print rarity — see the rarest-card breakdown below.`,
    "",
    NOTE,
  ].join("\n");
  return {
    slug, type: "valuable-card", setId: s.id,
    question: `What is the most valuable card in ${s.name}?`,
    title: `What is the most valuable card in ${s.name}?`,
    description, body,
    related: [
      { href: `/card/${c.id}`, label: `View ${c.name}` },
      { href: setFaqSlug("rarest-card", s.slug), label: `Rarest card in ${s.name}` },
      { href: setFaqSlug("chase-cards", s.slug), label: `${s.name} chase cards` },
    ],
  };
}

export function chaseCardsPage(s: FaqSetFacts): FaqPage {
  const slug = setFaqSlug("chase-cards", s.slug);
  const top = s.chaseCards.slice(0, 6);
  const lead = top[0];
  const description =
    `The chase cards in ${s.name} include ${top.slice(0, 3).map((c) => c.name).join(", ")} ` +
    `and other Illustration/Hyper Rares.`;
  const list = top.map((c) => `- [${cardLabel(c)}${c.rarity ? ` — ${c.rarity}` : ""}](/card/${c.id})`).join("\n");
  const body = [
    `**${description}**`,
    "",
    `Every set has a few cards everyone's hunting. In ${s.name}, the headliners are:`,
    "",
    list,
    "",
    `${lead.name} is the one most collectors open packs for. ` +
      (s.mostValuableCard ? `By price, ${cardLabel(s.mostValuableCard)} leads the set.` : ""),
    "",
    NOTE,
  ].join("\n");
  return {
    slug, type: "chase-cards", setId: s.id,
    question: `What are the chase cards in ${s.name}?`,
    title: `What are the chase cards in ${s.name}?`,
    description, body,
    related: [
      { href: setFaqSlug("rarest-card", s.slug), label: `Rarest card in ${s.name}` },
      ...(s.mostValuableCard ? [{ href: setFaqSlug("valuable-card", s.slug), label: `Most valuable ${s.name} card` }] : []),
      { href: `/set/${s.id}`, label: `Browse all ${s.name} cards` },
    ],
  };
}
```

- [ ] **Step 2: Implement the binder-size, release-date and ball-pattern templates**

`lib/content/faqs/templates/sets.ts`:
```ts
import type { FaqPage, FaqSetFacts } from "@/lib/content/faqs/types";
import { setFaqSlug } from "@/lib/content/faqs/slug";
import { num, pocketTable, recommendSentence } from "@/lib/content/faqs/format";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2025/01/17" → "17 January 2025". */
function prettyDate(releaseDate: string): string {
  const [y, m, d] = releaseDate.split("/").map(Number);
  if (!y || !m || !d) return releaseDate;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function binderSizePage(s: FaqSetFacts): FaqPage {
  const slug = setFaqSlug("binder-size", s.slug);
  const description =
    `The best binder for ${s.name} is a 9-pocket; the ${num(s.printedTotal)}-card set fills ` +
    `about ${Math.ceil(s.printedTotal / 9)} pages, or ${Math.ceil(s.masterSetCount / 9)} for a master set.`;
  const body = [
    `**${description}**`,
    "",
    `Nine-pocket binders are the collector default — they show a full 3×3 spread and sleeve ` +
      `${s.name}'s ${num(s.printedTotal)} base cards neatly. Here's the page count per size:`,
    "",
    `**Base set (${num(s.printedTotal)} cards):**`,
    pocketTable(s.printedTotal),
    "",
    `**Master set (${num(s.masterSetCount)} cards):**`,
    pocketTable(s.masterSetCount),
    "",
    recommendSentence(s.printedTotal, `the ${s.name} base set`),
    "",
    "Figures from the pokemontcg.io dataset, as of June 2026.",
  ].join("\n");
  return {
    slug, type: "binder-size", setId: s.id,
    question: `What's the best binder size for ${s.name}?`,
    title: `What's the best binder size for ${s.name}?`,
    description, body,
    related: [
      { href: setFaqSlug("card-count", s.slug), label: `How many cards in ${s.name}` },
      { href: setFaqSlug("master-set", s.slug), label: `${s.name} master set size` },
      { href: `/build?set=${s.id}`, label: `Plan your ${s.name} binder` },
      { href: "/binders", label: "Shop binders" },
    ],
  };
}

export function releaseDatePage(s: FaqSetFacts): FaqPage {
  const slug = setFaqSlug("release-date", s.slug);
  const when = prettyDate(s.releaseDate);
  const description = `${s.name} was released on ${when}, in the ${s.series} series.`;
  const body = [
    `**${description}**`,
    "",
    `${s.name} is a ${s.series}-series expansion with ${num(s.printedTotal)} cards in the main ` +
      `set (${num(s.total)} including secret rares), and it landed on ${when}.`,
    "",
    `It's the #${s.sizeRankAmongRecent} largest of the 20 most recent sets.`,
    "",
    "Figures from the pokemontcg.io dataset, as of June 2026.",
  ].join("\n");
  return {
    slug, type: "release-date", setId: s.id,
    question: `When did ${s.name} come out?`,
    title: `When did ${s.name} come out? (Release date)`,
    description, body,
    related: [
      { href: setFaqSlug("card-count", s.slug), label: `How many cards in ${s.name}` },
      { href: `/set/${s.id}`, label: `Browse ${s.name}` },
    ],
  };
}

/** Only call when s.hasBallPatterns is true. */
export function ballPatternsPage(s: FaqSetFacts): FaqPage {
  const slug = setFaqSlug("ball-patterns", s.slug);
  const description =
    `Yes — ${s.name} has ${num(s.pokeballCount)} Poké Ball and ${num(s.masterballCount)} Master Ball pattern cards.`;
  const body = [
    `**${description}**`,
    "",
    `${s.name} is one of the few sets with Poké Ball and Master Ball mirror cards — foils stamped ` +
      `with a repeating ball pattern. The Poké Ball pattern covers ${num(s.pokeballCount)} cards ` +
      `(roughly the reverse-holo pool), while the rarer Master Ball pattern appears on ` +
      `${num(s.masterballCount)} Pokémon.`,
    "",
    `They're why a ${s.name} master set balloons to ${num(s.masterSetCount)} cards.`,
    "",
    "Figures from the pokemontcg.io dataset, as of June 2026.",
  ].join("\n");
  return {
    slug, type: "ball-patterns", setId: s.id,
    question: `Does ${s.name} have Poké Ball and Master Ball pattern cards?`,
    title: `Does ${s.name} have Poké Ball & Master Ball cards?`,
    description, body,
    related: [
      { href: setFaqSlug("master-set", s.slug), label: `${s.name} master set size` },
      { href: `/build?set=${s.id}&mode=master&pb=1&mb=1`, label: `Build the ${s.name} master set` },
    ],
  };
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/content/faqs/templates/cards.ts lib/content/faqs/templates/sets.ts
git commit -m "feat(faqs): card-spotlight, binder, release-date, ball-pattern templates"
```

---

## Task 8: Pokémon-in-set template

**Files:**
- Create: `lib/content/faqs/templates/pokemon.ts`

- [ ] **Step 1: Implement the template**

`lib/content/faqs/templates/pokemon.ts`:
```ts
import type { FaqPage, FaqSetFacts, FaqPokemon } from "@/lib/content/faqs/types";
import { indefiniteArticle, pokemonInSetSlug, setFaqSlug } from "@/lib/content/faqs/slug";
import { cardLabel } from "@/lib/content/faqs/format";

export function pokemonInSetPage(s: FaqSetFacts, p: FaqPokemon): FaqPage {
  const slug = pokemonInSetSlug(p.slug, s.slug);
  const article = indefiniteArticle(p.displayName);
  const count = p.cards.length;
  const description =
    `Yes — there ${count === 1 ? "is" : "are"} ${count} ${p.displayName} ` +
    `card${count === 1 ? "" : "s"} in ${s.name}: ${p.cards.map(cardLabel).join(", ")}.`;
  const list = p.cards.map((c) => `- [${cardLabel(c)}${c.rarity ? ` — ${c.rarity}` : ""}](/card/${c.id})`).join("\n");
  const body = [
    `**${description}**`,
    "",
    count === 1
      ? `${s.name} has a single ${p.displayName} card:`
      : `${s.name} features ${count} different ${p.displayName} cards:`,
    "",
    list,
    "",
    `Want every ${p.displayName} print across all sets, not just ${s.name}? Build a dedicated ` +
      `${p.displayName} binder and see them side by side.`,
    "",
    "Figures from the pokemontcg.io dataset, as of June 2026.",
  ].join("\n");
  return {
    slug, type: "pokemon-in-set", setId: s.id,
    question: `Is there ${article} ${p.displayName} card in ${s.name}?`,
    title: `Is there ${article} ${p.displayName} card in ${s.name}?`,
    description, body,
    related: [
      { href: `/card/${p.cards[0].id}`, label: `View ${p.cards[0].name}` },
      { href: `/pokemon/${p.slug}~34an`, label: `Build a ${p.displayName} binder` },
      { href: setFaqSlug("chase-cards", s.slug), label: `${s.name} chase cards` },
      { href: `/set/${s.id}`, label: `Browse ${s.name}` },
    ],
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/content/faqs/templates/pokemon.ts
git commit -m "feat(faqs): pokemon-in-set template"
```

---

## Task 9: Registry assembling `FAQ_PAGES`

**Files:**
- Create: `lib/content/faqs/registry.ts`
- Test: `test/unit/faqs-registry.test.ts`

- [ ] **Step 1: Write the failing test**

`test/unit/faqs-registry.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { FAQ_PAGES, getFaqPage, faqPagesForSet, faqSlugs } from "@/lib/content/faqs/registry";

const internalFaq = (href: string) => href.startsWith("how-") || href.startsWith("is-there-") ||
  href.startsWith("best-") || href.startsWith("rarest-") || href.startsWith("most-") ||
  href.startsWith("chase-") || href.startsWith("when-") || href.startsWith("does-");

describe("faq registry", () => {
  it("produces a sizeable, slug-unique page set", () => {
    expect(FAQ_PAGES.length).toBeGreaterThan(250);
    expect(new Set(faqSlugs).size).toBe(faqSlugs.length);
  });

  it("skips valuable-card pages for priceless sets", () => {
    const priceless = new Set(["me4", "me3", "me2pt5"]);
    const valuable = FAQ_PAGES.filter((p) => p.type === "valuable-card");
    expect(valuable.some((p) => priceless.has(p.setId))).toBe(false);
    expect(valuable.length).toBe(17);
  });

  it("only emits ball-pattern pages for ball-pattern sets", () => {
    const ball = FAQ_PAGES.filter((p) => p.type === "ball-patterns");
    expect(ball.map((p) => p.setId).sort()).toEqual(["rsv10pt5", "sv8pt5", "zsv10pt5"]);
  });

  it("has no dangling internal FAQ links", () => {
    const known = new Set(faqSlugs);
    for (const page of FAQ_PAGES) {
      for (const r of page.related) {
        if (internalFaq(r.href)) expect(known.has(r.href)).toBe(true);
      }
    }
  });

  it("every page answer (description) is non-empty and mirrored into the body", () => {
    for (const page of FAQ_PAGES) {
      expect(page.description.length).toBeGreaterThan(20);
      expect(page.body).toContain(page.description);
      expect(page.question).toMatch(/\?$/);
    }
  });

  it("getFaqPage + faqPagesForSet resolve", () => {
    const sample = FAQ_PAGES[0];
    expect(getFaqPage(sample.slug)).toBe(sample);
    expect(faqPagesForSet(sample.setId)).toContain(sample);
    expect(getFaqPage("does-not-exist")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run test/unit/faqs-registry.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/content/faqs/registry.ts`**

```ts
import snapshot from "@/lib/content/faqs/data.json";
import type { FaqPage, FaqSetFacts, FaqSnapshot } from "@/lib/content/faqs/types";
import {
  cardCountPage, masterSetPage, secretRaresPage, illustrationRaresPage, reverseHolosPage,
} from "@/lib/content/faqs/templates/counts";
import { rarestCardPage, valuableCardPage, chaseCardsPage } from "@/lib/content/faqs/templates/cards";
import { binderSizePage, releaseDatePage, ballPatternsPage } from "@/lib/content/faqs/templates/sets";
import { pokemonInSetPage } from "@/lib/content/faqs/templates/pokemon";

const snap = snapshot as FaqSnapshot;

export const FAQ_AS_OF = snap.asOf;
export const FAQ_SETS: FaqSetFacts[] = snap.sets;

function pagesForSetFacts(s: FaqSetFacts): FaqPage[] {
  const pages: FaqPage[] = [
    cardCountPage(s),
    masterSetPage(s),
    binderSizePage(s),
    rarestCardPage(s),
    chaseCardsPage(s),
    secretRaresPage(s),
    illustrationRaresPage(s),
    reverseHolosPage(s),
    releaseDatePage(s),
  ];
  if (s.mostValuableCard) pages.push(valuableCardPage(s));
  if (s.hasBallPatterns) pages.push(ballPatternsPage(s));
  for (const p of s.marqueePokemon) pages.push(pokemonInSetPage(s, p));
  return pages;
}

export const FAQ_PAGES: FaqPage[] = snap.sets.flatMap(pagesForSetFacts);

const BY_SLUG = new Map(FAQ_PAGES.map((p) => [p.slug, p]));
export const faqSlugs: string[] = FAQ_PAGES.map((p) => p.slug);

export function getFaqPage(slug: string): FaqPage | undefined {
  return BY_SLUG.get(slug);
}

export function faqPagesForSet(setId: string): FaqPage[] {
  return FAQ_PAGES.filter((p) => p.setId === setId);
}

/** Sets in scope, newest first, each with its pages — for the grouped index. */
export function faqSetsWithPages(): { set: FaqSetFacts; pages: FaqPage[] }[] {
  return snap.sets.map((set) => ({ set, pages: faqPagesForSet(set.id) }));
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm vitest run test/unit/faqs-registry.test.ts`
Expected: PASS (6 tests). If "dangling internal FAQ links" fails, a template links to a slug that isn't generated — fix the guard in that template.

- [ ] **Step 5: Commit**

```bash
git add lib/content/faqs/registry.ts test/unit/faqs-registry.test.ts
git commit -m "feat(faqs): registry assembling all FAQ pages"
```

---

## Task 10: Structured-data builders

**Files:**
- Modify: `lib/structured-data.ts` (append two builders)
- Test: `test/unit/faqs-structured-data.test.ts`

- [ ] **Step 1: Write the failing test**

`test/unit/faqs-structured-data.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { faqPageJsonLd, faqsIndexJsonLd } from "@/lib/structured-data";

describe("faq structured data", () => {
  it("builds a single-question FAQPage mirroring the answer", () => {
    const ld = faqPageJsonLd("How many cards are in 151?", "151 has 165 cards.") as any;
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity[0]["@type"]).toBe("Question");
    expect(ld.mainEntity[0].name).toBe("How many cards are in 151?");
    expect(ld.mainEntity[0].acceptedAnswer.text).toBe("151 has 165 cards.");
  });

  it("builds a CollectionPage + ItemList for the index", () => {
    const ld = faqsIndexJsonLd([
      { slug: "rarest-card-in-151", question: "What is the rarest card in 151?", description: "x" },
    ]) as any;
    expect(ld["@type"]).toBe("CollectionPage");
    expect(ld.mainEntity["@type"]).toBe("ItemList");
    expect(ld.mainEntity.numberOfItems).toBe(1);
    expect(ld.mainEntity.itemListElement[0].url).toContain("/faqs/rarest-card-in-151");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run test/unit/faqs-structured-data.test.ts`
Expected: FAIL — `faqPageJsonLd` is not exported.

- [ ] **Step 3: Append the builders to `lib/structured-data.ts`**

Add at the end of the file:
```ts
/**
 * Single-question FAQPage for an individual /faqs page. The question is the
 * visible <h1> and the answer is the page's visible direct answer, so the
 * markup mirrors on-page content (Google's FAQ policy). FAQ rich results are
 * deprecated, but valid FAQ markup still helps AI Overviews / AI citation.
 */
export function faqPageJsonLd(question: string, answer: string): JsonLdObject {
  return {
    "@context": CONTEXT,
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      },
    ],
  };
}

/** CollectionPage + ItemList for the /faqs index. */
export function faqsIndexJsonLd(
  pages: Array<{ slug: string; question: string; description: string }>,
): JsonLdObject {
  return {
    "@context": CONTEXT,
    "@type": "CollectionPage",
    name: "Pokémon TCG set FAQs",
    url: absolute("/faqs"),
    description:
      "Answers to common questions about the latest Pokémon TCG sets — card counts, " +
      "master sets, binder sizes, rarest and most valuable cards, and more.",
    isPartOf: { "@type": "WebSite", url: absolute("/") },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: pages.length,
      itemListElement: pages.map((p, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: p.question,
        url: absolute(`/faqs/${p.slug}`),
      })),
    },
  };
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm vitest run test/unit/faqs-structured-data.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/structured-data.ts test/unit/faqs-structured-data.test.ts
git commit -m "feat(faqs): FAQPage + CollectionPage JSON-LD builders"
```

---

## Task 11: FAQ index page `/faqs`

**Files:**
- Create: `app/faqs/page.tsx`

- [ ] **Step 1: Implement the index page**

`app/faqs/page.tsx`:
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { FAQ_PAGES, faqSetsWithPages } from "@/lib/content/faqs/registry";
import { faqsIndexJsonLd } from "@/lib/structured-data";

const TITLE = "Pokémon TCG set FAQs";
const DESCRIPTION =
  "Quick, data-backed answers about the latest Pokémon TCG sets — how many cards, " +
  "master set sizes, the best binder size, rarest and most valuable cards, and more.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/faqs" },
  openGraph: { type: "website", title: TITLE, description: DESCRIPTION, url: "/faqs" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

/** Blog-style FAQ index, grouped by set (newest first). */
export default function FaqsIndexPage() {
  const groups = faqSetsWithPages();
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-pixel text-lg uppercase leading-relaxed sm:text-xl">{TITLE}</h1>
        <p className="font-body text-xl leading-tight">{DESCRIPTION}</p>
      </header>

      {groups.map(({ set, pages }) => (
        <section key={set.id} className="flex flex-col gap-2">
          <h2 className="font-pixel text-sm leading-relaxed">
            <Link href={`/set/${set.id}`} className="no-underline hover:underline">
              {set.name}
            </Link>
          </h2>
          <ul className="flex list-none flex-col gap-2 p-0">
            {pages.map((page) => (
              <li key={page.slug}>
                <Link
                  href={`/faqs/${page.slug}`}
                  className="group flex flex-col gap-0.5 border-[3px] border-gb-ink bg-gb-bg p-3 no-underline shadow-[3px_3px_0_0_var(--gb-ink)] motion-safe:transition-transform motion-safe:hover:-translate-y-0.5"
                >
                  <span className="font-pixel text-[11px] leading-relaxed group-hover:underline">
                    {page.question}
                  </span>
                  <span className="font-body text-base leading-tight">{page.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <JsonLd
        data={faqsIndexJsonLd(
          FAQ_PAGES.map((p) => ({ slug: p.slug, question: p.question, description: p.description })),
        )}
      />
    </main>
  );
}
```

- [ ] **Step 2: Build-check the route**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/faqs/page.tsx
git commit -m "feat(faqs): blog-style /faqs index page"
```

---

## Task 12: FAQ detail page `/faqs/[slug]`

**Files:**
- Create: `app/faqs/[slug]/page.tsx`

- [ ] **Step 1: Implement the detail page**

`app/faqs/[slug]/page.tsx`:
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GbLinkButton } from "@/components/gb/gb-button";
import { JsonLd } from "@/components/json-ld";
import { renderMarkdown } from "@/lib/content/render";
import { faqSlugs, getFaqPage, faqPagesForSet, FAQ_SETS } from "@/lib/content/faqs/registry";
import { breadcrumbJsonLd, faqPageJsonLd } from "@/lib/structured-data";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return faqSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getFaqPage(slug);
  if (!page) return { title: "FAQ" };
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/faqs/${slug}` },
    openGraph: { type: "article", title: page.title, description: page.description, url: `/faqs/${slug}` },
  };
}

/** An FAQ page that points at another FAQ uses a bare slug as its href; turn
 *  those into /faqs/<slug>, and leave app routes (/set, /card, …) untouched. */
function hrefFor(href: string): string {
  return /^(https?:|\/)/.test(href) ? href : `/faqs/${href}`;
}

export default async function FaqPage({ params }: Props) {
  const { slug } = await params;
  const page = getFaqPage(slug);
  if (!page) notFound();
  const html = renderMarkdown(page.body);
  const set = FAQ_SETS.find((s) => s.id === page.setId);
  const siblings = faqPagesForSet(page.setId).filter((p) => p.slug !== page.slug);

  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <nav aria-label="Breadcrumb" className="font-pixel text-sm">
        <Link href="/faqs" className="no-underline">◂ FAQs</Link>
      </nav>

      <h1 className="font-pixel text-lg leading-relaxed sm:text-xl">{page.question}</h1>

      <div className="flex flex-wrap items-center gap-2 border-[3px] border-gb-ink bg-gb-accent/30 px-3 py-2">
        <a
          href={`/faqs/${slug}/markdown`}
          className="inline-flex items-center border-[3px] border-gb-ink bg-gb-bg px-2 py-1 font-pixel text-[10px] no-underline"
        >
          READ AS MARKDOWN ▸
        </a>
        <span className="font-body text-lg leading-tight text-gb-ink">
          A plain-text version for LLMs &amp; AI search.
        </span>
      </div>

      <article
        className="flex flex-col [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-6 [&_h2]:font-pixel [&_h2]:text-sm [&_table]:my-2 [&_table]:border-collapse [&_td]:border [&_td]:border-gb-ink/40 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-gb-ink/40 [&_th]:px-2 [&_th]:py-1 [&_li]:font-body [&_li]:text-lg [&_p]:mb-3 [&_p]:font-body [&_p]:text-xl [&_p]:leading-relaxed [&_strong]:font-semibold [&_ul]:mb-3 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {page.related.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {page.related.map((r) => (
            <GbLinkButton key={r.href} href={hrefFor(r.href)} variant="a" size="sm">
              {r.label} ▸
            </GbLinkButton>
          ))}
        </div>
      )}

      {siblings.length > 0 && set && (
        <nav aria-label={`More about ${set.name}`} className="mt-2 flex flex-col gap-2 border-t-[3px] border-gb-ink pt-4">
          <h2 className="font-pixel text-sm leading-relaxed">More about {set.name}</h2>
          <ul className="flex list-none flex-col gap-1 p-0">
            {siblings.map((s) => (
              <li key={s.slug}>
                <Link href={`/faqs/${s.slug}`} className="font-body text-lg underline underline-offset-2">
                  {s.question}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <JsonLd
        data={[
          faqPageJsonLd(page.question, page.description),
          breadcrumbJsonLd([
            { name: "NOMEKOP", path: "/" },
            { name: "FAQs", path: "/faqs" },
            { name: page.question, path: `/faqs/${slug}` },
          ]),
        ]}
      />
    </main>
  );
}
```

- [ ] **Step 2: Build-check**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 3: Smoke-test render locally**

Run (fixture mode keeps it hermetic — FAQ pages don't need the API):
```bash
PORT=3170 TCG_DATA_SOURCE=fixture DISABLE_SPLASH=1 NEXT_PUBLIC_POSTHOG_KEY="" pnpm dev &
sleep 6
curl -s localhost:3170/faqs | grep -o "Pokémon TCG set FAQs" | head -1
curl -s localhost:3170/faqs/rarest-card-in-prismatic-evolutions | grep -o "rarest card in Prismatic Evolutions" | head -1
curl -s localhost:3170/faqs/is-there-an-umbreon-card-in-prismatic-evolutions | grep -o "Umbreon" | head -1
kill %1
```
Expected: each grep prints its match (index + two detail pages render).

- [ ] **Step 4: Commit**

```bash
git add app/faqs/[slug]/page.tsx
git commit -m "feat(faqs): /faqs/[slug] detail page with schema + cross-links"
```

---

## Task 13: Markdown companion route

**Files:**
- Create: `app/faqs/[slug]/markdown/route.ts`

- [ ] **Step 1: Implement the route**

`app/faqs/[slug]/markdown/route.ts`:
```ts
import { faqSlugs, getFaqPage } from "@/lib/content/faqs/registry";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";

export function generateStaticParams() {
  return faqSlugs.map((slug) => ({ slug }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const page = getFaqPage(slug);
  if (!page) return new Response("Not found\n", { status: 404 });

  const md = [
    `# ${page.question}`,
    "",
    `> ${page.description}`,
    `>`,
    `> Source: ${siteUrl()}/faqs/${slug} — NOMEKOP, an independent Pokémon TCG binder tool`,
    `> (not affiliated with Nintendo / The Pokémon Company). Figures as of June 2026.`,
    "",
    page.body,
    "",
  ].join("\n");

  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      Link: `<${siteUrl()}/faqs/${slug}>; rel="canonical"`,
    },
  });
}
```

- [ ] **Step 2: Build-check + smoke**

Run: `pnpm typecheck`
Expected: PASS. (Markdown render is verified end-to-end in Task 18's full smoke.)

- [ ] **Step 3: Commit**

```bash
git add app/faqs/[slug]/markdown/route.ts
git commit -m "feat(faqs): markdown companion route for LLMs/GEO"
```

---

## Task 14: Shared section OG image

One image for the whole section; Next.js inherits it for every `/faqs/*` page (no per-page generation cost).

**Files:**
- Create: `app/faqs/opengraph-image.tsx`

- [ ] **Step 1: Implement the OG image (mirrors the facts frame)**

`app/faqs/opengraph-image.tsx`:
```tsx
import { ImageResponse } from "next/og";

const INK = "#0f380f";
const ACCENT = "#8bac0f";
const BG = "#9bbc0f";

export const alt = "Pokémon TCG set FAQs — Nomekop";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", backgroundColor: BG, border: `16px solid ${INK}` }}>
        <div
          style={{
            display: "flex", flex: 1, margin: 10, border: `6px solid ${ACCENT}`,
            flexDirection: "column", alignItems: "flex-start", justifyContent: "center",
            padding: 64, position: "relative",
          }}
        >
          <div style={{ fontSize: 40, color: INK, opacity: 0.8 }}>NOMEKOP</div>
          <div style={{ fontSize: 84, color: INK, fontWeight: 700, lineHeight: 1.1 }}>
            Pokémon TCG{"\n"}set FAQs
          </div>
          <div style={{ fontSize: 32, color: INK, marginTop: 16 }}>
            Card counts · binders · rarest cards · chase cards
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
```

- [ ] **Step 2: Build-check**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/faqs/opengraph-image.tsx
git commit -m "feat(faqs): shared section Open Graph image"
```

---

## Task 15: Footer link + i18n key

**Files:**
- Modify: `components/site-footer.tsx`
- Modify: `lib/i18n/dictionaries/en.ts` and the 8 other dictionaries

- [ ] **Step 1: Add the `footer.faqs` key to English**

In `lib/i18n/dictionaries/en.ts`, in the `footer:` object, add after `funFacts`:
```ts
    faqs: "Set FAQs",
```

- [ ] **Step 2: Add `footer.faqs` to the other 8 dictionaries**

Add a `faqs` entry to the `footer:` object in each of: `ja.ts`, `fr.ts`, `de.ts`, `es.ts`, `it.ts`, `ko.ts`, `zh-tw.ts`, `zh-cn.ts`. Use these values (keep "FAQ" as the recognised initialism):
```
ja.ts    →   faqs: "セットFAQ",
fr.ts    →   faqs: "FAQ des sets",
de.ts    →   faqs: "Set-FAQs",
es.ts    →   faqs: "FAQ de sets",
it.ts    →   faqs: "FAQ dei set",
ko.ts    →   faqs: "세트 FAQ",
zh-tw.ts →   faqs: "套組常見問題",
zh-cn.ts →   faqs: "卡包常见问题",
```
(`Dictionary = typeof en`, so a missing key fails typecheck — that's the guard that all 9 are updated.)

- [ ] **Step 3: Add the footer link**

In `components/site-footer.tsx`, in the `links` array, add after the Fun Facts entry:
```tsx
    { href: "/faqs", label: dict.footer.faqs },
```

- [ ] **Step 4: Typecheck (proves all 9 dictionaries updated)**

Run: `pnpm typecheck`
Expected: PASS. A failure naming a dictionary file means that language is missing the `faqs` key.

- [ ] **Step 5: Commit**

```bash
git add components/site-footer.tsx lib/i18n/dictionaries
git commit -m "feat(faqs): footer link + i18n key in all locales"
```

---

## Task 16: Sitemap entries

**Files:**
- Modify: `app/sitemap.ts`

- [ ] **Step 1: Import the FAQ pages**

At the top of `app/sitemap.ts`, alongside the `ARTICLES` import:
```ts
import { FAQ_PAGES } from "@/lib/content/faqs/registry";
```

- [ ] **Step 2: Add the index + every FAQ page + markdown companion to the CORE shard**

In the `staticEntries` array (the `id === CORE_ID` branch), after the `/facts` article entries, add:
```ts
      { url: `${base}/faqs`, changeFrequency: "monthly" as const, priority: 0.6 },
      ...FAQ_PAGES.flatMap((page) => [
        {
          url: `${base}/faqs/${page.slug}`,
          changeFrequency: "monthly" as const,
          priority: 0.5,
        },
        {
          url: `${base}/faqs/${page.slug}/markdown`,
          changeFrequency: "monthly" as const,
          priority: 0.3,
        },
      ]),
```

- [ ] **Step 3: Verify the sitemap test still passes (if one exists) + typecheck**

Run: `pnpm typecheck && pnpm vitest run test/unit/ -t sitemap`
Expected: PASS (or "no tests" for the filter — typecheck is the gate).

- [ ] **Step 4: Commit**

```bash
git add app/sitemap.ts
git commit -m "feat(faqs): list /faqs pages in the sitemap"
```

---

## Task 17: `llms.txt` entries

**Files:**
- Modify: `app/llms.txt/route.ts`

- [ ] **Step 1: Import the FAQ pages**

Alongside the `ARTICLES` import:
```ts
import { FAQ_PAGES } from "@/lib/content/faqs/registry";
```

- [ ] **Step 2: Add a Key-pages bullet and a per-set-FAQ section**

In the `lines` array, add to the "## Key pages" block (after the Fun facts line):
```ts
    `- [Set FAQs](${base}/faqs): per-set answers — card counts, master sets, binder sizes, rarest & chase cards.`,
```
And before the closing `""`, append a new section:
```ts
    "",
    "## Per-set FAQ pages (each has a Markdown version)",
    ...FAQ_PAGES.map(
      (p) => `- [${p.question}](${base}/faqs/${p.slug}): ${p.description} Markdown: ${base}/faqs/${p.slug}/markdown`,
    ),
```

- [ ] **Step 3: Smoke-check**

Run: `pnpm typecheck`
Expected: PASS. (Endpoint content verified in Task 18.)

- [ ] **Step 4: Commit**

```bash
git add app/llms.txt/route.ts
git commit -m "feat(faqs): advertise /faqs pages in llms.txt"
```

---

## Task 18: "Common questions" block on `/set/[setId]`

**Files:**
- Modify: `app/set/[setId]/page.tsx`

- [ ] **Step 1: Import the helper**

Add to the imports at the top of `app/set/[setId]/page.tsx`:
```ts
import { faqPagesForSet } from "@/lib/content/faqs/registry";
```

- [ ] **Step 2: Compute the set's FAQ pages in the component body**

Inside `SetPage`, after `const { set, cards } = await loadSet(setId);`, add:
```tsx
  const faqs = faqPagesForSet(setId);
```

- [ ] **Step 3: Render the block**

Place this just before the page's closing `</main>` (or before the JSON-LD block — match the file's existing structure):
```tsx
      {faqs.length > 0 && (
        <section aria-label={`Common questions about ${set.name}`} className="mt-6 flex flex-col gap-2">
          <h2 className="font-pixel text-sm leading-relaxed">Common questions about {set.name}</h2>
          <ul className="flex list-none flex-col gap-1 p-0">
            {faqs.map((page) => (
              <li key={page.slug}>
                <Link href={`/faqs/${page.slug}`} className="font-body text-lg underline underline-offset-2">
                  {page.question}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
```
(`Link` is already imported in this file.)

- [ ] **Step 4: Build-check**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/set/[setId]/page.tsx
git commit -m "feat(faqs): link a set's FAQ pages from /set/[setId]"
```

---

## Task 19: Full verification

- [ ] **Step 1: Run the whole check suite**

Run: `pnpm check`
Expected: lint + typecheck + unit all PASS. (The pre-existing local-only failures noted in the repo memory — `set-pages.test.tsx`, two `action-bar` tests — are environmental; confirm no *new* failures in the `faqs-*` suites.)

- [ ] **Step 2: Production build (hermetic, fixture mode)**

Run: `TCG_DATA_SOURCE=fixture NEXT_PUBLIC_POSTHOG_KEY="" pnpm build`
Expected: build succeeds; output lists `/faqs` and a large `/faqs/[slug]` group (≈300 static params) and `/faqs/[slug]/markdown`.

- [ ] **Step 3: Serve the build and smoke the key surfaces**

Run:
```bash
PORT=3170 TCG_DATA_SOURCE=fixture DISABLE_SPLASH=1 NEXT_PUBLIC_POSTHOG_KEY="" pnpm start -p 3170 &
sleep 6
echo "--- index ---";        curl -s localhost:3170/faqs | grep -c "/faqs/"
echo "--- detail schema ---"; curl -s localhost:3170/faqs/how-many-cards-in-151 | grep -o '"@type":"FAQPage"' | head -1
echo "--- breadcrumb ---";    curl -s localhost:3170/faqs/how-many-cards-in-151 | grep -o '"@type":"BreadcrumbList"' | head -1
echo "--- markdown ---";      curl -s localhost:3170/faqs/how-many-cards-in-151/markdown | head -3
echo "--- llms.txt ---";      curl -s localhost:3170/llms.txt | grep -c "/faqs/"
echo "--- set block ---";     curl -s localhost:3170/set/sv3pt5 | grep -o "Common questions about 151" | head -1
kill %1
```
Expected: index shows many `/faqs/` links; detail page emits `FAQPage` + `BreadcrumbList` JSON-LD; markdown route returns the `# …` heading; `llms.txt` lists FAQ pages; the set page shows the FAQ block.

- [ ] **Step 4: Verify the deprecated-but-valid schema with a structured-data check (optional, manual)**

Note in the PR description: validate one detail page in Google's Rich Results Test / Schema.org validator — `FAQPage` should parse cleanly (no rich-result preview is expected, by Google's 2023+ policy; the markup is for AI/GEO and validity).

- [ ] **Step 5: Final commit / branch wrap-up**

```bash
git add -A && git status --short
git commit -m "test(faqs): full verification pass" --allow-empty
```
Then use the **superpowers:finishing-a-development-branch** skill to choose how to integrate (PR vs merge).

---

## Self-review notes (author)

- **Spec coverage:** all 12 question types → Tasks 6–8; snapshot/honesty (no-price skip, ball-only) → Tasks 3 + 9 (tested); cross-link mesh → templates' `related` + sibling block (Task 12) + `/set` block (Task 18); `FAQPage`+`BreadcrumbList` → Tasks 10/12; `CollectionPage` index → Tasks 10/11; sitemap/llms.txt/footer/i18n → Tasks 15–17; markdown companions → Task 13; OG → Task 14; tests → Tasks 1,3,4,5,9,10 + smoke 12/19.
- **Authoritative figures:** master-set count is guarded against the real `expandSlots` (Task 1); binder math reuses `evaluatePresets`/`recommendPreset` (Task 5); rarity order guarded against `rarityRank` (Task 1).
- **No dangling links:** Task 9 test asserts every internal FAQ `related` href resolves; templates guard `valuable-card`/`ball-patterns` links behind the same conditions the registry uses to emit them.
- **Type consistency:** `FaqPage`, `FaqSetFacts`, `FaqPokemon`, `FaqCardRef` defined once (Task 2) and used throughout; `setFaqSlug`/`pokemonInSetSlug` are the single slug source (Task 4), reused by templates and tests.
- **Open dial:** `POKEMON_PER_SET` (5) lives in `scripts/build-faqs.mjs`; change + re-run to re-snapshot.
