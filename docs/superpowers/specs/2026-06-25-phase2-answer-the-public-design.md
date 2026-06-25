# Phase 2 — Answer-The-Public keyword tool — design

**Date:** 2026-06-25
**Status:** Approved (design) — implementing
**Author:** drafted with Claude
**Parent roadmap:** `2026-06-25-entity-pages-and-faqs-roadmap.md` (Phase 2 / chunk A)

## 1. Goal

A **dev-time** tool that surfaces the real related searches people make about
Pokémon cards, sets, Pokémon and illustrators — replicating Answer The Public —
so FAQ/keyword coverage for the entity pages (Phases 3/4) is driven by genuine
search demand rather than guesswork. **Not** a runtime feature and **not**
auto-published FAQs: it emits research a human + the FAQ templates consult.

## 2. Findings (probed 2026-06-25)

All three autocomplete endpoints work here and return `[
query, [suggestions], … ]`:
- **Google** `suggestqueries.google.com/complete/search?client=firefox&q=…` —
  richest; appending a modifier ("charizard card how") yields real question
  phrases ("how much is it worth").
- **Bing** `api.bing.com/osjson.aspx?query=…` and **DuckDuckGo**
  `duckduckgo.com/ac/?q=…&type=list` — clean, good for breadth.

## 3. Decisions (resolved in brainstorming)

- **Scope: focused & deep.** Full modifier expansion on a curated seed set
  (~75 seeds), not the long tail. ~1.5–2k requests, ~10 min throttled.
- **Output: report + structured candidates.** No auto-published FAQs.
- **Engines:** Google drives modifier expansion; Bing + DDG add breadth on the
  bare seed.

## 4. Architecture

### 4.1 `scripts/atp-core.mjs` (pure, unit-tested)
- `MODIFIERS` — `questions` (who/what/when/where/why/how/which/are/can/do/is/will),
  `prepositions` (for/with/without/near/to), `comparisons` (vs/and/or/like), and
  `alphabet` (a–z) behind an off-by-default option (noisy, high-volume).
- `expandSeed(seed, { alphabet })` → query strings: bare seed + seed + " " +
  each enabled modifier.
- `parseSuggest(json)` → `string[]` — one parser for all three engine shapes
  (`Array.isArray(json) ? json[1] : []`), defensive against odd payloads.
- `classifyIntent(text)` → FAQ-angle tag via a keyword map:
  `value` (price/worth/value/expensive/sell), `count` (how many/number of),
  `rarity` (rare/rarest/rarity), `list` (list/checklist/all), `editions`
  (1st edition/shadowless/edition), `grading` (psa/cgc/grade/graded),
  `authenticity` (fake/real/authentic), `set` (set/expansion/booster), else
  `general`.
- `groupSuggestion(text, seed)` → `question | comparison | preposition |
  alphabetical | related` (by leading/contained modifier).
- `aggregate(rawPerQuery)` → dedupe by text, count `freq`, collect contributing
  `engines`, attach `intent` + `group`; sorted by freq desc then text.
- `buildClusters(suggestions)` → group the aggregated suggestions into the five
  buckets for the report.

### 4.2 `scripts/answer-the-public.mjs` (orchestration, network)
- **Seeds** from `lib/content/entities/data.json` (top ~30 Pokémon + top ~15
  artists by card count) and `lib/content/faqs/data.json` (newest ~15 set names),
  plus ~15 hand-listed base TCG terms. Each tagged `type`
  (`base|pokemon|artist|set`) + `entity` where applicable.
- **Harvest:** for each seed, `expandSeed` → query Google for every modifier,
  Bing + DDG for the bare seed; concurrency-limited, throttled, retried (reuse
  the fetch/concurrency helpers from `backfill-artists.mjs`).
- **Aggregate + cluster** per seed via `atp-core`.
- **Outputs (committed):**
  - `data/keyword-research/candidates.json` — `{ asOf, stats, seeds: [{ seed,
    type, entity?, suggestions:[{text,intent,group,freq,engines}], clusters }] }`.
  - `docs/keyword-research/report.md` — AtP-style grouped report per seed + a
    top-intents summary across all seeds.
- **No silent truncation:** log seeds processed, queries issued, failures.

## 5. Tests
- `test/unit/atp-core.test.ts` — `expandSeed` (bare + modifiers; alphabet
  toggle), `parseSuggest` (Google/Bing/DDG shapes + junk), `classifyIntent`
  (each tag), `groupSuggestion`, `aggregate` (dedupe/freq/engines), `buildClusters`.

## 6. Out of scope
- Runtime/user-facing keyword UI.
- Auto-generating FAQ pages from suggestions (Phases 3/4 author data-backed
  answers; this only informs which questions to answer).
- Scheduling/automation — run manually, never CI.

## 7. Risks
- **Endpoint ToS / rate limits** — mitigated by throttling, low default volume,
  manual runs; degrade gracefully if an engine fails (others still contribute).
- **Non-determinism** — autocomplete drifts; the committed snapshot is a
  point-in-time research artifact, refreshed on demand (asOf recorded).
