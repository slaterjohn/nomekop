# Phase 4 — Artist info pages + sub-pages — design

**Date:** 2026-06-25
**Status:** Implemented
**Parent roadmap:** `2026-06-25-entity-pages-and-faqs-roadmap.md` (Phase 4 / chunk C)

## Goal
`/illustrator/[slug]` info pages (gated to artists with ≥5 cards) plus three
sub-pages, mirroring the Pokémon pages built in Phase 3.

## Routing (branch-on-`~`)
`app/illustrator/[token]/page.tsx` dispatches: decodable token → existing binder;
bare slug via `getArtistEntity` → info page; else 404. Sub-pages attach under the
same segment (valid only for a bare slug):
- `…/illustrations` — Illustration Rares + Special Illustration Rares.
- `…/set/[setId]` — the artist's cards in one set.
- `…/pokemon/[slug]` — the artist's cards of one Pokémon (matched by dex).

## Pieces
- `artistFaqEntries(artist)` in `lib/content/entities/faq.ts` (pure, TDD): value →
  card count → most-drawn Pokémon → illustration count → history.
- `getArtistCards(slug)` in `lib/tcg` — EXACT artist-slug match (so "DOM" ≠
  "Domino"), consistent with the snapshot stats.
- `isIllustrationRare(rarity)` in `lib/tcg/rarity.ts`.
- `components/illustrator/illustrator-info.tsx` — header (signature card → /card),
  stat grid (first/latest set → /set), most-drawn Pokémon (→ per-Pokémon sub-page),
  FAQs, the sets list (→ per-set sub-pages), binder + illustrations CTAs, and a
  capped card gallery (120, with an honest "showing N of M" note for big artists).
- `components/illustrator/artist-cards-subpage.tsx` — shared shell for the three
  sub-pages (breadcrumb, heading, gallery).
- `app/sitemap.ts` — gated artist info + illustrations pages. Per-set/per-Pokémon
  sub-pages are reachable via on-page links, so they're left to the crawl.

## Tests
`entity-faq.test.ts` (+5 artist cases), `illustrator-info.test.tsx` (render: heading,
stats, FAQ, binder/illustrations/top-Pokémon/per-set links, gallery card links, axe),
`seo-foundation.test.ts` updated for the new sitemap entries. Full suite green (757).
