# Phase 1 — Entity foundation (artist backfill, stats snapshot, registry) — design

**Date:** 2026-06-25
**Status:** Approved (design) — implementing
**Author:** drafted with Claude
**Parent roadmap:** `2026-06-25-entity-pages-and-faqs-roadmap.md` (Phase 1 / chunk B)

## 1. Goal

Build the **data + lib foundation** for Pokémon and illustrator information
pages: a committed stats snapshot and a runtime registry, plus an artist
backfill so recent sets aren't missing credits. **No pages** in this phase —
those are Phases 3/4. **No cross-linking UI** — that's Phase 5 (but this phase
exposes the lookup maps it will need).

## 2. Data findings (measured 2026-06-25 against the warm cache)

- Cache is fully warm: **173 sets, 20,359 cards**.
- **Artist coverage 93.8%**, but **7 sets have zero artist credits**: `sv8pt5`
  (Prismatic Evolutions), `sv8` (Surging Sparks), `sv7` (Stellar Crown),
  `sv6pt5` (Shrouded Fable), `me1`, `me3`, `sve`.
- pokemontcg.io **genuinely lacks** artist for these (probed: 0/250 for `sv8`),
  so a re-fetch won't help. **TCGdex has it** (sv08-001 → "Tetsu Kayama";
  10/12 sampled present; blanks are Energy cards).
- **Artist distribution:** ≥5 cards → 273 artists, ≥10 → 214, ≥3 → 319.
  Long tail: 121 artists with <5 cards.
- **1,020 of 1,025 species have cards**; ~84% of all cards carry a `dex` array
  (the rest are Trainers/Energy).

## 3. Decisions (resolved in brainstorming)

- **Artist page threshold: ≥5 cards** (273 pages). Below-threshold artists get
  no standalone page but still resolve to a binder and remain linkable.
- **Backfill now, via committed read-time overrides** sourced from TCGdex —
  not a cache re-fetch (cache is gitignored + re-fetches from the artist-less
  API in prod). Mirrors the existing `applyBallPatterns` / `master-counts.json`
  read-time augmentation pattern.
- **Pokémon identity = dex/species**, not name substring. The existing binder
  matches by name substring (`searchNameInIndex` → `includes`), which is
  imprecise for stats ("mew" substring-matches "Mewtwo"). Dex grouping is exact.
  Minor divergence from the substring binder is documented and reconciled in
  Phase 3.
- **Snapshot for stats, live for card galleries** (per roadmap §4.2). Snapshot
  also carries one `signatureCard` ref per entity (hero image + cross-link
  thumbnail) so those work even cold.
- **Scope = all 173 sets** (full history), unlike the 3-era FAQ snapshot.

## 4. Part A — Artist backfill (read-time overrides from TCGdex)

### 4.1 `scripts/backfill-artists.mjs` (dev-time, manual)
- For each set whose cached cards lack artist, resolve its TCGdex set id
  (curated map: `sv8`→`sv08`, `sv7`→`sv07`, `sv6pt5`→`sv06.5`,
  `sv8pt5`→`sv08.5`, `me1`→`me01`, `me3`→`me03`, `sve`→ S&V Energies; verified
  against TCGdex `/sets` at build time, skipping any not yet on TCGdex).
- Fetch each TCGdex card, map `illustrator` → artist, key by the pokemontcg.io
  card id matched on **collector number** (`sv08-001` ↔ `sv8-1`; strip leading
  zeros; warn + skip non-numeric/secret mismatches rather than guess).
- Write committed **`data/artist-overrides.json`**: `{ "sv8-1": "Tetsu Kayama", … }`.
- **No silent truncation:** log per-set matched/unmatched counts and any set
  skipped because TCGdex lacks it (e.g. a brand-new 2026 set).

### 4.2 `lib/tcg/artist-overrides.ts` (runtime)
- `applyArtistOverrides(cards)` — for a card with no `artist`, fill from the
  override map; never overwrite a real credit (so it self-heals if pokemontcg.io
  later adds the field). Pure, idempotent, no-op when the map has no entry.
- Applied wherever cards are read for display/stats: the `getCards` read path
  (alongside `applyBallPatterns`) and the card-index union (`card-index.ts`), so
  binders, the index, and the snapshot all see the credit. `build-entities.mjs`
  applies the same committed file directly.

## 5. Part B — Compute, snapshot, registry

### 5.1 `scripts/entity-compute.mjs` (pure, unit-tested)
Imports shared helpers from `faq-compute.mjs` (`rarityRank`, `RARITY_ORDER`,
`ILLUSTRATION_RARITIES` equivalent, `baseSpecies`, `speciesSlug`,
`marketPriceOf`, `cardRef`) to avoid drift.
- `pokemonStatsFor(dex, name, slug, cards)` → per-species stats.
- `artistStatsFrom(cards)` → grouped per artist slug.
- Helpers: `signatureCardOf(cards)` (max market price; fallback rarest),
  `topSpeciesFor(cards, n)` (group by species, count, top n).

### 5.2 `scripts/build-entities.mjs`
- Read cache DB (all 173 sets + cards), like `build-faqs.mjs`.
- Per set: `applyBallPatterns` then `applyArtistOverrides`; attach
  `setId/setName/setReleaseDate`.
- Join `data/pokemon-names.json` (1,025 species; emit only those with ≥1 card).
- Compute Pokémon + artist stats; gate artists at ≥5.
- Write **`lib/content/entities/data.json`**.

### 5.3 Snapshot schema (`lib/content/entities/data.json`)
```jsonc
{
  "asOf": "June 2026",
  "thresholds": { "artistMinCards": 5 },
  "pokemon": [{
    "dex": 25, "slug": "pikachu", "name": "Pikachu",
    "cardCount": 0, "sirCount": 0, "illustrationRareCount": 0,
    "artistCount": 0, "setCount": 0,
    "firstSet": { "id": "", "name": "", "releaseDate": "" },
    "latestSet": { "id": "", "name": "", "releaseDate": "" },
    "rarities": { "Common": 0 },
    "signatureCard": { "id": "", "name": "", "number": "", "rarity": "", "imageSmall": "" }
  }],
  "artists": [{                       // only cardCount >= 5
    "slug": "mitsuhiro-arita", "name": "Mitsuhiro Arita",
    "cardCount": 0, "setCount": 0, "illustrationCount": 0,
    "earliestSet": { "id": "", "name": "", "releaseDate": "" },
    "latestSet": { "id": "", "name": "", "releaseDate": "" },
    "topPokemon": [{ "slug": "charizard", "name": "Charizard", "count": 0 }],
    "signatureCard": { "id": "", "name": "", "number": "", "rarity": "", "imageSmall": "" }
  }],
  "artistIndex": [{ "slug": "", "name": "", "cardCount": 0 }]   // ALL artists, for linking/gating
}
```
- `sirCount` = "Special Illustration Rare" only; `illustrationRareCount` =
  Illustration Rare + Special IR. Artist `illustrationCount` = same union.

### 5.4 `lib/content/entities/registry.ts` (runtime API)
- Pokémon: `getPokemonEntity(slug)`, `getPokemonByDex(dex)`,
  `allPokemonEntities()`, `pokemonSlugs()`.
- Artists: `getArtistEntity(slug)`, `gatedArtistSlugs()`, `artistHasPage(slug)`
  (cardCount ≥ threshold), `allArtistsForLinking()`.
- Cross-link lookups (cheap, exposed now for Phase 5): name→slug maps for
  Pokémon and artists.

## 6. Tests
- `test/unit/entity-compute.test.ts` — guard test mirroring
  `faqs-compute.test.ts`: assert entity-compute's rarity/SIR/illustration
  definitions stay identical to the app's `lib/tcg/rarity.ts`; unit-test
  `pokemonStatsFor` / `artistStatsFrom` / `signatureCardOf` / `topSpeciesFor` on
  small fixtures (incl. the mew/Mewtwo precision case and a multi-dex card).
- `test/unit/artist-overrides.test.ts` — `applyArtistOverrides` fills only blank
  credits, is idempotent, and no-ops without a map entry.

## 7. Out of scope (later phases)
- Pokémon/artist **pages** and sub-pages (Phases 3/4).
- Cross-linking **components/linkifier/icons** (Phase 5) — only the lookup data
  is exposed here.
- Reconciling the substring binder with dex identity (Phase 3).

## 8. Risks
- **TCGdex collector-number mismatches** for secret/alt-art numbering → matched
  by exact trailing number, mismatches logged and skipped (not guessed).
- **Brand-new sets absent from TCGdex** → stay gapped this run; re-run backfill
  after TCGdex catches up. Logged, never silent.
- **Snapshot staleness** → document `build-entities.mjs` + `backfill-artists.mjs`
  alongside `build-faqs.mjs` as the post-new-set regeneration steps.
