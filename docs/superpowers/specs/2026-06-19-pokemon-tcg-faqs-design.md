# Pokémon TCG per-set FAQ section (`/faqs`) — design

**Date:** 2026-06-19
**Status:** Approved (design) — pending spec review
**Author:** drafted with Claude

## 1. Goal

Add a new, SEO-focused **`/faqs`** section to NOMEKOP: a large set of individual
pages, each answering **one** Pokémon TCG question about **one** of the **20 most
recently released sets**. Each page is a focused, data-backed answer with the
correct FAQ structured data, written in a casual-but-authoritative voice, and
wired into a dense internal-linking mesh. A blog-style index lists every page.

This is **programmatic SEO done honestly**: every page carries unique, real
figures pulled from the card database (counts, rarest/most-valuable cards,
specific Pokémon prints), so pages are substantively differentiated rather than
thin/doorway boilerplate.

### Why now / strategic note
- Per-set "how many cards / master set / binder / rarest card" pages are a
  validated long-tail play (competitors like PokéCottage and Cardrake rank with
  per-set guides).
- **FAQ rich results are deprecated** (Google removed the visible SERP feature),
  **but `FAQPage` schema is still valid and now mainly helps AI Overviews / AI
  citation** — which dovetails with NOMEKOP's existing GEO surface (`/llms.txt`,
  per-article Markdown companions). So the schema work is still worth it; we
  frame it as GEO, not classic rich snippets.

## 2. The 20 sets in scope

The 20 most recent sets by release date (from the cache DB, newest first):

Chaos Rising (me4), Perfect Order (me3), Ascended Heroes (me2pt5), Phantasmal
Flames (me2), Mega Evolution (me1), White Flare (rsv10pt5), Black Bolt
(zsv10pt5), Destined Rivals (sv10), Journey Together (sv9), Prismatic Evolutions
(sv8pt5), Surging Sparks (sv8), Stellar Crown (sv7), Shrouded Fable (sv6pt5),
Twilight Masquerade (sv6), Temporal Forces (sv5), Paldean Fates (sv4pt5),
Paradox Rift (sv4), 151 (sv3pt5), Obsidian Flames (sv3), Paldea Evolved (sv2).

The set list is derived at snapshot-build time (sort all sets by `releaseDate`
desc, take 20), so it advances naturally as new sets are added and the snapshot
is regenerated.

## 3. Question types

Twelve question types. Each is its own dedicated page (no merging). Counts in
the table are real, from the cache DB.

| # | Type key | Question (per set) | Primary data | Per-set? |
|---|----------|--------------------|--------------|----------|
| 1 | `card-count` | How many cards are in **[Set]**? | printedTotal, total, supertype split | all 20 |
| 2 | `master-set` | How many cards are in a **[Set]** master set? | base + reverse + ball mirrors | all 20 |
| 3 | `binder-size` | What's the best binder size for **[Set]**? | page math for 4/9/12/16-pocket | all 20 |
| 4 | `rarest-card` | What is the rarest card in **[Set]**? | top card by rarity rank | all 20 |
| 5 | `valuable-card` | What is the most valuable card in **[Set]**? | top card by TCGplayer market price | **17** (priced) |
| 6 | `chase-cards` | What are the chase cards in **[Set]**? | top N SIR/hyper/UR cards | all 20 |
| 7 | `secret-rares` | How many secret rares are in **[Set]**? | total − printedTotal + breakdown | all 20 |
| 8 | `illustration-rares` | How many Illustration Rares are in **[Set]**? | IR + Special IR counts | all 20 |
| 9 | `reverse-holos` | How many reverse holo cards are in **[Set]**? | count of `variants.reverse` | all 20 |
| 10 | `release-date` | When did **[Set]** come out? | releaseDate + set facts | all 20 |
| 11 | `ball-patterns` | Does **[Set]** have Poké Ball & Master Ball pattern cards? | ball-pattern rules | **3** (sv8pt5, zsv10pt5, rsv10pt5) |
| 12 | `pokemon-in-set` | Is there a **[Pokémon]** card in **[Set]**? | which card(s), number, rarity | ~5 Pokémon × 20 |

**Skips are intentional, not silent:**
- Type 5 is **not generated** for the 3 newest sets with no TCGplayer prices
  (Chaos Rising / Perfect Order / Ascended Heroes) — fabricating a "most
  valuable" answer would violate data honesty. The `rarest-card` and
  `chase-cards` pages still cover those sets (rarity-based).
- Type 11 is only generated for the 3 sets that actually have ball patterns
  (genuine "yes" pages). We do **not** mass-produce 17 near-identical "no" pages
  (that would be thin content).

**Estimated total ≈ 300 pages**: ~180 (types 1–4, 6–10 × 20) + 17 (type 5) +
3 (type 11) + ~100 (type 12). The single tuning dial is the per-set Pokémon cap
(`POKEMON_PER_SET`, default 5).

## 4. Architecture

Follows the existing `/facts` pattern (`lib/content/articles.ts` +
`app/facts/*`), adapted from hand-authored bodies to **snapshot + templates**
because ~300 pages can't be hand-written.

### 4.1 Data: committed snapshot

A generator script reads the cache DB **once** and writes a committed JSON
snapshot. Pages render from the snapshot — never from a live DB/API read.

**Why a snapshot, not live reads:** fixture mode only has 2 sets cached
(`base1`, `sv1`), so live reads during `next build`/e2e would 404 all 20 sets.
A committed snapshot keeps builds hermetic and tests deterministic — exactly how
`lib/content/stats.ts` already works. Pages state "Figures as of June 2026";
re-running the script refreshes them.

- **Script:** `scripts/build-faqs.mjs` — opens `.cache/bindermon.db` read-only
  (via `node:sqlite`, as the app does), computes the snapshot for the latest 20
  sets, writes `lib/content/faqs/data.json`. Documented as the regen path. It
  replicates the small, well-defined master-set math (base + `variants.reverse`
  + Poké/Master Ball rules from `lib/tcg/ball-patterns.ts`) and is cross-checked
  against a known figure (Prismatic Evolutions master set = 481).
- **Snapshot shape** (`lib/content/faqs/types.ts`):

```ts
type FaqCardRef = { id: string; name: string; number: string; rarity?: string;
                    marketPrice?: number };
type FaqPokemon = { slug: string; displayName: string; cards: FaqCardRef[] };
type FaqSetFacts = {
  id: string; name: string; slug: string; series: string;
  releaseDate: string;            // YYYY/MM/DD
  printedTotal: number; total: number;
  secretCount: number;            // max(0, total - printedTotal)
  pokemonCount: number; trainerCount: number; energyCount: number;
  reverseHoloCount: number;
  masterSetCount: number;         // base + reverse + pokeball + masterball
  pokeballCount: number; masterballCount: number;
  hasBallPatterns: boolean;
  illustrationRareCount: number;  // "Illustration Rare" + "Special Illustration Rare"
  rarityHistogram: Record<string, number>;
  rarestCard: FaqCardRef;
  mostValuableCard?: FaqCardRef;  // absent when no price data
  chaseCards: FaqCardRef[];       // top ~6 by rarity rank then price
  marqueePokemon: FaqPokemon[];   // top POKEMON_PER_SET, deduped by species
  // cross-set context for "cross facts"
  sizeRankAmongRecent: number;    // 1 = largest printedTotal of the 20
};
type FaqSnapshot = { asOf: string; sets: FaqSetFacts[] };
```

### 4.2 Selection algorithms

- **Rarest card:** highest `rarityRank` (`lib/tcg/rarity.ts`); ties broken by
  highest collector number, then market price.
- **Most valuable card:** highest TCGplayer `market` (fallback `high`/`mid`/
  `low`) across variants; absent if the set has no priced cards.
- **Chase cards:** top ~6 cards by (rarityRank, price), Pokémon-supertype
  preferred, de-duplicated.
- **Marquee Pokémon:** Pokémon-supertype cards with a chase rarity, ranked by
  (rarityRank, price), **de-duped by base species** (strip ` ex/V/VMAX/VSTAR/GX`
  suffixes), capped at `POKEMON_PER_SET`. A small evergreen boost nudges
  Charizard/Pikachu/Eevee up **only when they actually appear** in the set
  (every page stays a real "yes" with a card to link to).
- **Best binder size:** for standard (`printedTotal`) and master
  (`masterSetCount`) counts, compute pages = `ceil(count / pockets)` for
  pockets ∈ {4, 9, 12, 16}; recommend the size that the rest of the app favours
  (9-pocket as the collector default, with the page count shown for each).

### 4.3 Prose: typed templates

One template module per question type under `lib/content/faqs/templates/`,
each exporting `(facts, extra) => FaqPage`:

```ts
type FaqPage = {
  slug: string; type: FaqType; setId: string;
  question: string;        // visible <h1> AND schema Question.name
  title: string;           // <title>
  description: string;     // meta description AND schema acceptedAnswer (the
                           // direct answer, mirrored verbatim as page text)
  body: string;            // Markdown (no H1)
  related: { href: string; label: string }[];  // CTAs + cross-question links
};
```

- `lib/content/faqs/registry.ts` runs all templates over the snapshot at module
  load (pure, deterministic) and exports `FAQ_PAGES: FaqPage[]`, plus helpers
  `getFaqPage(slug)`, `faqPagesForSet(setId)`, `faqSlugs`.
- Bodies are ~150–300 words: **direct answer first** (reused as the schema
  answer + meta description), 1–2 context paragraphs that fold in **cross-facts**
  (e.g. the rarest-card page also notes the card's price and links to the
  most-valuable page; the card-count page notes the set's size rank among recent
  sets), a related-questions list, and a CTA. Real figures + natural per-template
  variation keep each page unique.
- Voice: casual but authoritative. Reuses the GB-styled components (`font-pixel`
  headings, `GbLinkButton`) to match the site.

### 4.4 Slugs & routes

- `/faqs` — blog-style index, grouped by set (newest first), each set listing
  its question links; plus a short "browse by question type" jump list.
- `/faqs/[slug]` — one FAQ page; `generateStaticParams` from `faqSlugs`.
- `/faqs/[slug]/markdown` — plain-Markdown companion (mirrors
  `/facts/[slug]/markdown`) for LLMs/GEO.

Slug scheme (kebab; set-slug from set name, e.g. `prismatic-evolutions`,
`black-bolt`, `151`):

| Type | Slug |
|------|------|
| card-count | `how-many-cards-in-<set>` |
| master-set | `how-many-cards-in-<set>-master-set` |
| binder-size | `best-binder-size-for-<set>` |
| rarest-card | `rarest-card-in-<set>` |
| valuable-card | `most-valuable-card-in-<set>` |
| chase-cards | `chase-cards-in-<set>` |
| secret-rares | `how-many-secret-rares-in-<set>` |
| illustration-rares | `how-many-illustration-rares-in-<set>` |
| reverse-holos | `how-many-reverse-holos-in-<set>` |
| release-date | `when-did-<set>-come-out` |
| ball-patterns | `does-<set>-have-ball-pattern-cards` |
| pokemon-in-set | `is-there-a-<pokemon>-card-in-<set>` |

Slugs are globally unique by construction (set-slug suffix + unique Pokémon
slug per set). A test asserts uniqueness. The visible H1 handles "a/an" Pokémon
grammar; the slug always uses `is-there-a-` for determinism.

## 5. Cross-linking model

The internal-link mesh is a primary deliverable, not an afterthought.

- **Per-set sibling block:** every page renders "More about [Set]" linking to
  all other FAQ pages for the same set. The registry only ever links to pages
  that actually exist (e.g. it skips the `valuable-card` link for price-less
  sets).
- **Contextual inline links** between related questions: rarest ↔ most-valuable
  ↔ chase cards; master-set ↔ binder-size ↔ reverse-holos; secret-rares ↔
  illustration-rares; release-date ↔ card-count.
- **App-route CTAs:** `card-count`/`secret-rares` → `/set/[id]` + `/build`;
  `binder-size`/`master-set` → `/build` + `/binders`; `rarest`/`valuable`/
  `chase`/`pokemon-in-set` → `/card/[id]`; `pokemon-in-set` → the Pokémon's
  `/pokemon/<slug>~34an` binder.
- **Cross to `/facts`:** where a relevant trivia article exists (e.g. a
  Charizard-in-151 page → "how many Charizard cards exist"), link it.
- **From `/set/[id]`:** a "Common questions about [Set]" block linking that
  set's FAQ pages (the one change to an existing content page; strengthens crawl
  + the link graph).

## 6. Structured data

New builders in `lib/structured-data.ts`:

- `faqPageJsonLd(question, answer)` → `FAQPage` with a single `Question` whose
  `acceptedAnswer.text` is the page's visible direct answer (Google requires the
  Q&A to be visible; we mirror `description` verbatim). Rendered on every
  `/faqs/[slug]`.
- Plus `breadcrumbJsonLd([NOMEKOP, FAQs, <question>])` (reuses the existing
  helper) on each page.
- `faqsIndexJsonLd(pages)` → `CollectionPage` + `ItemList` for `/faqs` (mirrors
  `factsCollectionJsonLd`). The index does **not** emit `FAQPage` (the answers
  aren't all visible there).

JSON-LD is serialized by the existing `<JsonLd>` component (escapes `<`).

## 7. Integration / plumbing

| File | Change |
|------|--------|
| `components/site-footer.tsx` | Add a `/faqs` link beside Fun Facts (`dict.footer.faqs`). |
| `lib/i18n/dictionaries/*.ts` (×9) | Add `footer.faqs` key. English = "FAQs"; other langs translated (or kept as the initialism where idiomatic). |
| `app/sitemap.ts` | Add `/faqs`, every `/faqs/<slug>`, and each Markdown companion to the CORE shard (next to the articles block). |
| `app/llms.txt/route.ts` | Add a "## Per-set FAQs" section: the index link + each page with its Markdown companion (mirrors the articles block). |
| `app/set/[setId]/page.tsx` | Add the "Common questions about [Set]" block (filtered `faqPagesForSet`). |

New files:

```
scripts/build-faqs.mjs
lib/content/faqs/types.ts
lib/content/faqs/data.json            # committed snapshot
lib/content/faqs/registry.ts
lib/content/faqs/templates/*.ts       # one per question type (12)
lib/content/faqs/markdown.ts          # body→markdown companion (reuses renderMarkdown for HTML)
app/faqs/page.tsx
app/faqs/[slug]/page.tsx
app/faqs/[slug]/markdown/route.ts
app/faqs/[slug]/opengraph-image.tsx   # optional, mirrors /facts OG image
test/unit/faqs.test.ts
```

## 8. Edge cases & error handling

- **No-price sets:** `mostValuableCard` absent → no `valuable-card` page, and no
  inbound links to it. Asserted by test.
- **Ball patterns:** only the 3 mapped sets get a `ball-patterns` page.
- **Rarity ties:** deterministic tie-break (number, then price).
- **Pokémon "a/an":** vowel-initial display names use "an" in the H1; slug fixed.
- **Fewer than `POKEMON_PER_SET` chase Pokémon:** generate as many as exist.
- **Unknown slug:** `notFound()`.
- **Set-name → slug collisions:** none among the 20; uniqueness test guards
  regressions when the snapshot advances.

## 9. Testing

`test/unit/faqs.test.ts` (vitest):
- All 20 sets present in the snapshot; counts are positive integers; secret
  count = max(0, total − printed).
- Every set has the all-20 page types; the 3 ball-pattern sets have a
  `ball-patterns` page and others don't; only priced sets have `valuable-card`.
- Slugs globally unique; every `related` href that points at `/faqs/...`
  resolves to an existing page (no dangling internal links).
- Schema builders return the expected `@type` and mirror the page answer.
- The Markdown route returns the body for a known slug and 404s otherwise.
- Page render smoke test (RTL) for one representative slug per template family.

Also: run `pnpm check` (lint + typecheck + unit) and a focused `pnpm e2e`
smoke (the existing data e2e gotchas re: fixture mode / port 3170 still apply).

## 10. Out of scope (YAGNI)

- Multi-language FAQ pages (English only; matches `/facts`).
- Sets older than the latest 20.
- "No, [Pokémon] is not in [Set]" pages and blanket ball-pattern "no" pages.
- Editorial/opinion pages ("is [Set] worth collecting") — kept out to stay
  data-honest.
- Automated snapshot refresh on a schedule (manual `scripts/build-faqs.mjs`
  re-run for now; can be added to the daily refresher later).

## 11. Open questions

- Per-set Pokémon cap: default **5**. Adjustable before/after build.
- OG image per FAQ page: include (mirrors `/facts`) unless we want to keep the
  page count's build cost down — default **include**.
