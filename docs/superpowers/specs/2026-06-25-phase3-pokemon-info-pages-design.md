# Phase 3 — Pokémon info pages — design

**Date:** 2026-06-25
**Status:** Implemented
**Parent roadmap:** `2026-06-25-entity-pages-and-faqs-roadmap.md` (Phase 3 / chunk D)

## Goal
User-visible `/pokemon/[slug]` info pages mirroring `/set/me4`: stats, data-backed
FAQs, a link to every card, and a shortcut into the binder.

## Routing (approved branch-on-`~`)
`app/pokemon/[token]/page.tsx` dispatches: `decodePokemonToken` succeeds → existing
binder (untouched); bare slug resolving via `getPokemonEntity` → info page; else
`notFound`. `generateMetadata` branches identically. No existing binder URL changes.

## Pieces
- `lib/content/entities/faq.ts` → `pokemonFaqEntries(entity)` (pure, TDD): data-backed
  Q&A ordered by the Phase 2 intent finding (value → count → SIRs → history →
  artists). Value question only when the signature card is priced; SIR question only
  when sirCount > 0. Rendered verbatim + emitted as `faqJsonLd`.
- `getPokemonCardsByDex(dex)` in `lib/tcg` — exact-species gallery (matches the
  snapshot stats, not the substring binder). Same source strategy as `getPokedexCards`.
- Reusable entity components: `StatGrid`, `EntityCardGallery`, `EntityFaqSection`
  (shared with Phase 4 artist pages).
- `components/pokemon/pokemon-info.tsx` — the page body: header with signature-card
  thumbnail (→ /card), stat grid (first/latest set → /set), FAQ section, card gallery
  (→ /card), "Build a binder" CTA.
- `app/sitemap.ts` — adds `/pokemon/[slug]` for every species with cards (1,020).

## Cross-linking scope
Only natural hardcoded links now (card → /card, set → /set). The auto-linkifier +
pixel-icon link types are Phase 5.

## Tests
`entity-faq.test.ts` (FAQ generation), `pokemon-info.test.tsx` (render: heading,
stats, FAQ, binder CTA href, set + card links, axe a11y), `seo-foundation.test.ts`
updated for the new sitemap entries.
