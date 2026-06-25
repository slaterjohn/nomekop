# Entity pages, entity FAQs & the cross-linking web — roadmap

**Date:** 2026-06-25
**Status:** Approved (roadmap) — pending spec review
**Author:** drafted with Claude

This is a **decomposition roadmap**, not a single-feature design. It covers five
interlocking sub-projects. Each phase gets its own `spec → plan → implement`
cycle; this document fixes the shared architecture, the scope of each phase, the
dependencies between them, and the build order.

## 1. Goal

Turn NOMEKOP from a set-centric tool into a densely cross-linked web of
information pages — the "Wikipedia effect" — by adding rich, SEO-focused
**information pages for every Pokémon and (gated) illustrator**, an
**Answer-The-Public-style research tool** to expand FAQ/keyword coverage, and a
**cross-linking system** that turns every entity mention into a typed, visually
distinct internal link with images as link targets.

The existing per-set page (`/set/me4`) is the template every new info page
mirrors: stats panel, FAQ section, live card gallery, builder shortcut.

## 2. Current state (what already exists)

Established by code exploration on 2026-06-25:

- **Set pages** (`app/set/[setId]/page.tsx`) — complete: stats, binder-layout
  table, live card gallery (each card → `/card/[id]`), per-set FAQ section.
- **Binders, not info pages**, for entities:
  - `/illustrator/<slug>~<rows><cols><order>` is **only a binder**.
  - `/pokemon/<slug>~<rows><cols><filter><order>` is **only a binder**.
  - Neither has stats, FAQs, or an info landing page.
- **FAQ system** — snapshot-driven and **per-set only**
  (`scripts/faq-compute.mjs` → `scripts/build-faqs.mjs` →
  `lib/content/faqs/data.json` → `templates/*` → `registry.ts`). No keyword /
  related-search discovery tool.
- **Facts** (`app/facts`, `lib/content/articles.ts`) — hand-authored essays.
- **Data layer** — `lib/tcg/card-index.ts` unions every cached set's cards into
  one in-memory index carrying `artist`, `dex`, `rarity`, `setId`,
  `setReleaseDate`, `secret`, prices, etc. All entity stats are derivable from
  it **with zero new API calls** once the cache is warm.
- **Cross-linking** — does not exist. Links are hand-authored in markdown.
  `pixelarticons` is installed but unused for links.

## 3. Decisions resolved during brainstorming

- **Page scale:** quality-gated. Every Pokémon with ≥1 card gets a full page
  (~1,000); illustrators need ≥ a card threshold (default **≥5**, finalised in
  Phase 1) for a full page. Below-threshold artists get a lightweight page or
  none — decided in Phase 1 to avoid thin content / index bloat.
- **Answer-The-Public source:** live autocomplete → committed seed. A dev-time
  script hits Google/Bing/DuckDuckGo `suggest` endpoints, captures real related
  searches, and commits the results. Non-deterministic, run manually, never in
  CI (same discipline as `build-faqs.mjs`).

## 4. Cross-cutting architecture (applies to all phases — APPROVED)

### 4.1 URL structure: clean slug = info page, `~token` = binder

Reuse the existing dynamic segments; branch on the presence of `~`. The token
decoders already require a `~` and return `null` for a bare slug, so this breaks
no existing binder URL.

| URL | Renders |
|---|---|
| `/pokemon/pikachu` | **new** Pokémon info page |
| `/pokemon/pikachu~34an` | existing binder (unchanged) |
| `/illustrator/ken-sugimori` | **new** artist info page |
| `/illustrator/ken-sugimori~34n` | existing binder (unchanged) |
| `/illustrator/ken-sugimori/illustrations` | **new** sub-page: illustration/full-art cards only |
| `/illustrator/ken-sugimori/set/me4` | **new** sub-page: this artist in one set |
| `/illustrator/ken-sugimori/pokemon/pikachu` | **new** sub-page: this artist's cards of one Pokémon |

The `[token]` `page.tsx` branches: decodes → render binder; bare slug → render
info page. Sub-pages attach as child routes that are only valid for a bare slug.

### 4.2 Data foundation: committed snapshot for stats, live for cards

Mirror the proven FAQ pattern. A `build-entities.mjs` (+ pure `entity-compute.mjs`)
reads the cache DB and commits per-artist and per-Pokémon **stats + the gating
decision** as JSON. Stats are snapshotted (hermetic, deterministic, drives
static params + sitemap); **card galleries render live** from the card index —
exactly how `/set/me4` pairs snapshot facts with live cards. Manual rebuild when
new sets land.

### 4.3 Cross-linking: explicit components + conservative auto-linkifier

A central **entity registry** (Pokémon from `pokemon-names.json`, gated artists
from the snapshot, sets from the API, cards explicit-only). Two link paths:

- **Explicit components** — `<PokemonLink>`, `<ArtistLink>`, `<SetLink>`,
  `<CardLink>` — wherever we control the JSX.
- **A conservative markdown linkifier** for prose bodies (articles/FAQs): known
  entities only, whole-word, **first-mention-per-page**, never inside existing
  links or headings, longest-match-wins. Deliberately not aggressive full-text
  auto-linking, to avoid false positives.

### 4.4 Visual link types: pixel icon + distinct (non-dotted) underline per type

Each typed link carries a `pixelarticons` glyph + its own underline so the link
type is readable at a glance (e.g. Pokémon = pokéball glyph, Artist =
pencil/brush glyph, Set = stacked-cards glyph, Card = card glyph; each with a
distinct, non-dotted underline). Exact glyphs/colours/underline styles are
finalised in Phase 5 using the in-browser visual companion.

## 5. Phases

Each phase is a separate spec/plan/implement cycle. Dependencies drive the order.

### Phase 1 — Entity foundation (chunk B) · prerequisite for all
**Scope:** data + lib only; no pages.
- `scripts/entity-compute.mjs` — pure, unit-tested stat functions (guarded by a
  test mirroring the app's logic, like `faq-compute`).
- `scripts/build-entities.mjs` — cache DB → committed
  `lib/content/entities/data.json` (artist stats + Pokémon stats + artist gating).
- `lib/content/entities/registry.ts` — runtime API (`getArtist`,
  `getPokemonStats`, `listGatedArtists`, name→slug lookups) **and** the
  linkable-entity registry Phase 5 consumes.
- **Artist stats:** total cards, sets appeared in, illustration / special-IR
  count, earliest set, latest set, most-drawn Pokémon.
- **Pokémon stats:** total cards, SIR count, distinct-artist count, set count,
  first appearance, rarity spread.
- **Open questions for its spec:** finalise the artist card threshold; decide how
  to handle the `artist` field missing on some older cached payloads (backfill
  the cache vs. gate those cards out); exact snapshot schema.

### Phase 2 — Answer The Public tool (chunk A) · "FAQs first"
**Scope:** dev-time research tool, seeded from Phase 1's registry.
- `scripts/answer-the-public.mjs` — autocomplete `suggest` calls for seeds
  (`"charizard card"`, `"mitsuhiro arita"`, `"<set> cards"`), capturing real
  related searches; results committed as data.
- Cluster suggestions into question/keyword groups; emit **FAQ candidates** to
  feed the templates used by Phases 3–4.
- **Open questions for its spec:** politeness/rate-limiting; seed selection;
  output format; how candidates get promoted into committed FAQ content.

### Phase 3 — Pokémon info pages (chunk D) · proves the pattern
**Scope:** `/pokemon/[slug]` (bare-slug branch).
- Mirrors `/set/me4`: stats panel, FAQ section (`/faqs/pokemon/[slug]`, routed
  like `/faqs/set/[setId]`), live card gallery (each card → `/card/[id]`),
  prominent "Build a Pikachu binder" button to the existing binder.
- Simpler than artists (no sub-pages) → de-risks the info-page pattern first.

### Phase 4 — Artist info pages + sub-pages (chunk C)
**Scope:** `/illustrator/[slug]` + three sub-pages.
- Main page: stats panel (sets, illustrations designed, earliest/latest set,
  most-drawn Pokémon), FAQs, live card gallery, "Build a binder" button.
- `…/illustrations` — illustration/full-art cards only.
- `…/set/[setId]` — this artist in one set.
- `…/pokemon/[slug]` — this artist's cards of one Pokémon (placeholder-style
  illustration as on the Pokédex).

### Phase 5 — Cross-linking + visual link types + images (chunk E) · the web
**Scope:** weave the web now that all targets exist.
- Link components + the conservative markdown linkifier (§4.3).
- Pixel-icon + distinct-underline styling per type (§4.4), designed with the
  visual companion.
- Retrofit existing surfaces (set, FAQ, facts, new entity pages) to auto-link
  entity mentions and to use **images as link targets** (card thumbs, Pokémon
  illustrations, set symbols, artist representative cards).
- Update `app/sitemap.ts` for all new routes.

## 6. Build order & rationale

1. **Phase 1 (B)** — unblocks all others.
2. **Phase 2 (A)** — the "FAQs first" engine; needs B's entity list to seed
   queries; its output shapes FAQ content for D and C.
3. **Phase 3 (D)** — simpler entity page; validates the pattern end-to-end.
4. **Phase 4 (C)** — artist pages + sub-pages, building on the proven pattern.
5. **Phase 5 (E)** — last, so there are real targets to link to and images to
   hang the web on.

## 7. Risks & cross-phase concerns

- **Cache warmth / `artist` coverage.** Stats quality depends on a warm cache
  with `artist` present. Phase 1 must measure coverage and decide the backfill
  vs. gate-out policy before later phases depend on the numbers.
- **Thin content / index bloat.** The gating threshold (Phase 1) and the
  honest, data-backed page bodies (per-entity real figures) are the mitigations,
  consistent with the existing FAQ programmatic-SEO approach.
- **Auto-link false positives.** Mitigated by the conservative, explicit-first
  linkifier (§4.3); Phase 5 must include a false-positive test corpus.
- **Snapshot staleness.** Entity stats, like FAQs, need manual regeneration when
  sets land. Document the `build-entities.mjs` step alongside `build-faqs.mjs`.

## 8. Out of scope (for now)

- Automatic, aggressive full-text linking of every entity mention everywhere.
- Real-time (non-snapshot) stat computation in production.
- Localisation of entity pages beyond what the existing i18n layer provides.
