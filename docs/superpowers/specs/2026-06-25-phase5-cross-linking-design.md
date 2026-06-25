# Phase 5 — Cross-linking, typed link styling & images — design

**Date:** 2026-06-25
**Status:** Implemented
**Parent roadmap:** `2026-06-25-entity-pages-and-faqs-roadmap.md` (Phase 5 / chunk E)

## Goal
Weave the "Wikipedia effect": entity mentions become typed internal links with a
pixel icon + a distinct (non-dotted) underline per type, and images act as link
targets — now that Pokémon, artist, set and card pages all exist.

## Pieces
- `lib/content/linkify.ts` — conservative prose auto-linker (pure, TDD): wraps the
  FIRST mention of a known Pokémon / multi-word gated artist in a Markdown link.
  Case-sensitive, whole-word, longest-match-wins, first-mention-only, never inside
  existing links / inline code / fenced code / headings. Sets and single-token
  artist names are deliberately NOT auto-linked (too many common words). Memoised
  matchers + first-char bucketing for per-render performance.
- `lib/content/entity-icons.ts` — shared inline pixel-SVG icons + per-type
  underline classes (Pokémon solid, set thick, artist double, card wavy). Icons
  inherit the palette via `currentColor`, so they survive every Game Boy theme.
- `lib/content/render.ts` — marked renderer that styles internal entity links
  (icon + underline); external links fall through. `renderMarkdown(md, {linkify})`
  runs the auto-linker first. Enabled on `/facts/[slug]` and `/faqs/[slug]`.
- `components/entities/entity-link.tsx` — `PokemonLink` / `ArtistLink` / `SetLink`
  / `CardLink` for the React entity pages, matching the prose styling exactly.
  The Pokémon + artist info pages now render set references as typed `SetLink`s.

## Images as link targets (delivered across Phases 3–5)
Signature-card heroes and full card galleries on the entity pages are images that
link to `/card/[id]`; set symbols / FAQ card thumbnails already link out. Specific
cards shown always link to their card page.

## Scope guard
Auto-linking is intentionally conservative (Pokémon + multi-word artists). Card
names are explicit-only. Global/aggressive full-text linking is out of scope.

## Tests
`linkify.test.ts` (11, incl. a false-positive corpus: Mew≠Mewtwo, code, headings,
existing links, lowercase words), `render.test.ts` (typed link classes/icons per
type, external links untouched, linkify on/off). Full suite green (773); production
build compiles.
