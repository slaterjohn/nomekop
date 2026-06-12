# Bindermon — Design Spec

**Date:** 2026-06-11
**Status:** Approved (user delegated approval; autonomous build authorized)
**Source:** Obsidian notes `3. Projects/Ideas/Pokemon Binder Maker` + user direction in session

## 1. Overview

Bindermon is a web app for Pokemon TCG collectors. A collector picks a set, chooses a binder
grid (rows × columns), picks how they collect (Standard or Master set with interleaved
reverse-holo parallels), previews the binder page-by-page, and downloads printable A4 PDFs:
binder layout pages, a checklist, and card-slot placeholders.

The screen experience is a love letter to the original Game Boy Pokemon games (DMG-era):
4-shade palettes, pixel typography, menu cursors, dialogue boxes, screen-wipe transitions.
The printed output is deliberately clean and minimal (ink-friendly).

### Goals (MoSCoW from notes → scope)

| Feature | Priority | In scope |
|---|---|---|
| Select any set (Pokemon TCG API) | Must | Yes |
| Select rows and columns | Must | Yes (1–5 × 1–5) |
| Interleaved parallel sets (reverse holos) | Must | Yes (Master mode) |
| Binder page layout printouts (PDF) | Must | Yes |
| Pokemon TCG API integration | Must | Yes (pokemontcg.io v2 behind an interface) |
| Checklist for binder | Should | Yes (printable PDF + on-screen tick-off in localStorage) |
| Presets (layouts; Basic/Master collection modes) | Could | Yes |
| Card slot placeholder printouts | Could | Yes |
| Binder cover stickers | Won't | No |
| Interactive online version (accounts, sharing) | Won't | No (config is URL-encoded, which is free shareability, but no server state) |
| Show missing cards / set stats / social assets / affiliate recommendations | Won't | No |

### Non-goals

No user accounts, no server-side persistence of user data, no payments, no social features.

## 2. Decisions and deviations from the original notes

The notes describe MongoDB + Redis + S3/CDN + a separate Puppeteer worker container deployed
via GitHub Actions to a VPS. Decisions, with rationale:

1. **No MongoDB, no Redis, no S3.** Nothing in scope stores user data; those stores existed
   purely to cache a third-party API. Replaced with a layered in-memory LRU + filesystem TTL
   cache behind a `CacheStore` interface, plus stale-while-revalidate (measured: the TCG API
   intermittently exceeds 15s, then responds in 0.5s — caching is the fix, the brand of cache
   is not). The interface keeps Mongo/Redis pluggable later.
2. **No separate worker container.** Puppeteer runs in-process in the Next.js server with a
   concurrency limit of 3 and retry (per the notes' own limits). The PDF pipeline renders the
   app's own `/print/*` routes, so preview and PDF share one rendering path. A separate worker
   remains a deploy-time option since the PDF module is self-contained.
3. **Docker and CI still provided** (notes require containerized deployment): a single
   multi-stage `Dockerfile` (with Chromium deps), `docker-compose.yml`, and a GitHub Actions
   workflow (lint → typecheck → unit → e2e → docker build).
4. **Interface tech honored:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui +
   React Query. Visual design diverges from "modern minimalist" per explicit user direction:
   Game Boy aesthetic on screen, minimalist on paper.
5. **Fixtures over live API in tests.** Real captured pokemontcg.io JSON committed as
   fixtures; the whole test suite runs offline and deterministically. Live API is behind
   `CardDataSource`, selected by environment.

## 3. Architecture

Single Next.js app (App Router, TypeScript strict, React 19, Tailwind v4, pnpm).

```
app/
  page.tsx                    # Builder (main flow)
  layout.tsx                  # Theme provider, fonts, skip link
  print/
    binder/page.tsx           # A4 print view: binder pages
    checklist/page.tsx        # A4 print view: checklist
    placeholders/page.tsx     # A4 print view: cut-out slot placeholders
  api/
    sets/route.ts             # GET — list sets (cached)
    cards/[setId]/route.ts    # GET — all cards for a set (cached, paginated upstream)
    pdf/route.ts              # POST — { type, config } → application/pdf
    img/route.ts              # GET — allowlisted caching image proxy (PDF reliability)
components/
  gb/                         # Game Boy design system (custom, on Radix/shadcn primitives)
  builder/                    # SetSelector, ConfigPanel, BinderPreview, ActionBar, ChecklistPanel
  print/                      # Shared print-layout components (used by /print/* routes)
lib/
  tcg/                        # CardDataSource interface, pokemontcg.io client, fixture source, types
  cache/                      # CacheStore interface, MemoryCache (LRU), FsCache (TTL), layering, SWR
  layout/                     # PURE layout engine: sort, variant expansion, pagination, presets, stats
  pdf/                        # Puppeteer renderer: browser singleton, p-limit(3), retry, timeout
  sound/                      # Optional WebAudio 8-bit blips (muted by default)
  checklist-store.ts          # localStorage tick-off persistence
styles/                       # Tailwind config, theme token CSS variables per palette
test/                         # fixtures/ (captured API JSON), helpers, e2e/
```

### Module contracts (isolation)

- **`lib/tcg`** — `CardDataSource { getSets(): Promise<TcgSet[]>; getCards(setId): Promise<TcgCard[]> }`.
  Implementations: `PokemonTcgIoSource` (fetch, 25s timeout, 2 retries w/ backoff, API key from
  `POKEMONTCG_API_KEY` if set, upstream pagination at pageSize 250), `FixtureSource` (reads
  committed JSON). Source chosen by `TCG_DATA_SOURCE=live|fixture` (default live; tests force fixture).
  In-flight request coalescing prevents stampedes.
- **`lib/cache`** — `CacheStore { get, set, getOrCompute }` with TTL; `MemoryCache` (LRU ≤ 50)
  over `FsCache` (`.cache/tcg/*.json`). Default TTL 24h; stale entries are served immediately
  while a background refresh runs (stale-while-revalidate). Cache failures degrade to direct fetch.
- **`lib/layout`** — pure functions, no I/O. See §5.
- **`lib/pdf`** — `renderPdf({ path, query }): Promise<Buffer>`; lazily-launched shared browser;
  per-render new page; waits for network idle + image settle; `page.pdf({ format: 'A4', printBackground: true, margin: 0 })`
  (margins come from `@page` CSS); concurrency `p-limit(3)`; 1 retry; 60s timeout; browser
  relaunch on crash.
- **`app/api/img`** — `GET /api/img?src=<url>`: rejects any host other than
  `images.pokemontcg.io` (SSRF allowlist), streams with an on-disk cache, long
  `Cache-Control`. Print routes use proxied URLs; the interactive preview uses `next/image`
  with `remotePatterns` for the same host.
- **`app/api/pdf`** — zod-validated body `{ type: 'binder'|'checklist'|'placeholders', config: BinderConfig }`;
  in-memory token-bucket rate limit (cheap protection: Puppeteer is expensive); maps config to
  the matching `/print/*` URL on `localhost:<own port>`; returns PDF with
  `Content-Disposition: attachment; filename="<set>-<type>.pdf"`.

### Data flow

1. Builder page server-renders with the sets list (`getSets`, cached).
2. Client selects a set → React Query fetches `/api/cards/[setId]` (cached server-side).
3. Config changes (rows, cols, mode, toggles) update URL searchParams (shareable/bookmarkable)
   and re-run the pure layout engine in the client → preview updates instantly.
4. "Download PDF" → `POST /api/pdf` → Puppeteer renders `/print/<type>` with the same
   layout engine and components → browser downloads the file. "Print" button opens the print
   route directly for the browser's native dialog (no-server fallback).

## 4. Data model

```ts
type TcgSet = {
  id: string; name: string; series: string;
  printedTotal: number; total: number; releaseDate: string; // 'YYYY/MM/DD'
  symbolUrl: string; logoUrl: string;
};

type TcgCard = {
  id: string; name: string; number: string;        // number can be '4', '85a', 'TG01', 'SV001'
  rarity: string | undefined; supertype: string;
  imageSmall: string; imageLarge: string;
  variants: { normal: boolean; reverse: boolean; holo: boolean }; // derived, see below
};

type BinderConfig = {
  setId: string; rows: 1|2|3|4|5; cols: 1|2|3|4|5;
  mode: 'standard' | 'master';
  includeSecrets: boolean;          // numbers beyond printedTotal / prefixed subsets
  printStyle: 'clean' | 'retro';    // print routes only; default clean
};
```

**Variant derivation** (at the `lib/tcg` boundary, so the layout engine stays pure):
`tcgplayer.prices` keys when present (`normal`, `reverseHolofoil`, `holofoil`, plus
`1stEdition*`/`unlimited*` variants in vintage sets). Fallback heuristic when `tcgplayer` is
absent: sets released before 2002 (pre–Legendary Collection) have no reverses; otherwise
Common/Uncommon/Rare/Rare Holo cards with plain numeric numbers ≤ printedTotal are assumed
`normal + reverse`. Prefixed/secret cards default to no reverse.

## 5. Layout engine (pure, exhaustively tested)

**Sorting (natural card-number order):** parse `number` into `(prefix, numeric, suffix)`
— e.g. `'TG01' → ('TG', 1, '')`, `'85a' → ('', 85, 'a')`. Order: unprefixed numerics
ascending first (suffixed numbers immediately after their base), then prefixed groups in
alphabetical prefix order, each numerically ascending. Cards with unparseable numbers sort
last in input order.

**Mode expansion:**
- `standard`: one slot per card.
- `master`: cards with `variants.reverse` emit two adjacent slots — `[normal, reverse]`
  (interleaved parallels per the notes). Reverse slots carry a visual "REV" badge (preview:
  badge + sheen treatment; print: corner badge — never colour alone).
- `includeSecrets=false` filters out cards numbered beyond `printedTotal` and all
  prefixed-subset cards (TG/GG/SV…). Default **true** (a binder usually wants the whole set).

**Pagination:** fill slots left→right, top→bottom into pages of `rows × cols`. The final page
keeps empty trailing pockets. Output:
`BinderLayout = { pages: Page[]; stats: { cards, slots, pages, slotsPerPage } }` with
`Page = { number, slots: Slot[] }`, `Slot = { kind: 'card'|'reverse'|'empty', card? }`.
Preview groups pages into facing **spreads** (page 1 sits alone on the right, like a real
binder; subsequent spreads are pairs).

**Presets:** layout presets 2×2, 3×3 (default), 4×3, 4×4; collection presets map to
`mode` (+`includeSecrets`): "Standard set" `standard`, "Master set" `master`.

**Edge cases under test:** empty set; 1×1 grid; set where no card has a reverse; secret-only
filtering; `85a`-style suffixes; TG/GG/SV prefixes; >250-card sets; exact-multiple page fill;
master-mode odd interleave crossing a page boundary.

## 6. UI / UX

### Flow (single page, progressive)

1. **Title bar**: pixel BINDERMON wordmark with a one-time staggered reveal (skippable,
   never blocks interaction; reduced-motion: static).
2. **CHOOSE SET**: shadcn `Command` palette restyled as a GB menu — search-as-you-type,
   grouped by series, set symbol + name + card count per row, ▶ cursor on the active row,
   d-pad (arrow key) navigation.
3. **CONFIGURE**: rows/cols steppers (GB A/B-style − / + buttons) + layout preset chips;
   collection mode toggle (Standard/Master) with a one-line explainer in a GB dialogue box;
   "include secret rares" toggle. Live stats line: "X cards → Y slots → Z pages".
4. **PREVIEW**: binder spread with page-flip animation, page navigation (buttons + arrow
   keys + page jump), card cells with lazy-loaded images, reverse slots badged "REV",
   checklist tick-off mode (tap/Space toggles a Poke Ball "collected" mark; persisted to
   localStorage per set+mode; "n/m collected" HP-bar progress).
5. **ACTION BAR**: Download Binder PDF · Download Checklist PDF · Download Placeholders PDF ·
   Print (native dialog) · print-style toggle (Clean/Retro). Async actions show the Poke Ball
   spinner with `aria-live` status announcements; failures show a GB dialogue with Retry.

### Game Boy design system (`components/gb`)

Custom components, built on Radix/shadcn primitives wherever semantics matter
(Command, Dialog, Toggle, Slider, Tooltip, Toast):

- `GbScreen` — bezel frame + subtle dot-matrix texture (opacity ≤ 0.04, never harms contrast).
- `GbMenu` / `GbMenuItem` — `listbox`/`option` semantics, roving tabindex, blinking ▶ cursor
  as the focus/selection indicator (plus a 2px outline for windowed high-vis focus).
- `GbButton` — chunky bordered button; hover raises, press translates 1px down-right
  ("button press" depth), variants A (primary) / B (secondary) / plain.
- `GbDialogBox` — double-line rounded GB text-box border; optional typewriter text
  (skippable on click/key, instant under reduced motion, `aria-live="polite"` announces the
  full text immediately).
- `GbProgress` — HP-bar style progress (label + fraction, `role="progressbar"`).
- `GbSpinner` — pixel Poke Ball wobble; `role="status"`.
- `GbBadge`, `GbToggle`, `GbStepper`, `GbToast`, `GbKbdHint` (bottom hint bar: "▲▼ navigate ·
  A select · B back" mapped to actual keys).
- Blinking ▼ "more" indicator on scrollable dialogue.

### Palettes (themes; CSS variables on `[data-theme]`, persisted in localStorage)

| Theme | Shades (dark → light) | Notes |
|---|---|---|
| `dmg` (default) | `#0f380f · #306230 · #8bac0f · #9bbc0f` | Original DMG green LCD |
| `pocket` | `#000000 · #555555 · #aaaaaa · #e8e8e8` | Game Boy Pocket grayscale |
| `kanto-red` | `#2d0a0a · #7a1f1f · #d98c8c · #f3e3e3` | SGB-style Red cartridge nod |
| `cerulean` | `#0a1a2d · #1f4a7a · #8cb4d9 · #e3edf3` | SGB-style Blue cartridge nod |
| `high-contrast` | `#000000 · #333333 · #cccccc · #ffffff` | Accessibility option |

Token roles: `bg` (lightest), `surface`, `border/muted` (mid shades — large text, borders,
decoration only), `ink` (darkest — all body text). **A unit test computes WCAG contrast for
every theme:** `ink`/`bg` ≥ 4.5:1, `ink`/`surface` ≥ 4.5:1, focus indicator vs adjacent ≥ 3:1,
mid-shade usage pairs ≥ 3:1 (large-text/UI roles only). Themes failing the test fail CI.
Exact mid-shade values may be nudged during implementation to pass — the test is the contract.

**Typography:** Press Start 2P (display/labels/buttons, ≥ 12px with generous line-height),
VT323 (body, ≥ 18px), self-hosted via `next/font` (no external font CDN). Print routes use
system sans (Inter-like stack) for card labels at 10pt per the notes, except Retro print style
which uses the pixel faces.

### Motion & sound inventory

All motion wrapped in a `prefers-reduced-motion` gate (CSS media query + JS hook):

| Effect | Where | Reduced-motion behaviour |
|---|---|---|
| Screen-wipe (venetian blinds clip-path) | step/section transitions | instant cut |
| Staggered card deal-in (≤ 12 cards/wave) | preview page change | fade only |
| Page-flip (3D rotateY on spread) | preview navigation | instant swap |
| ▶ cursor blink, ▼ continue blink | menus/dialogues | static visible cursor |
| Button press depth | all GbButtons | retained (non-vestibular, sub-150ms) |
| Typewriter text | dialogue boxes | instant full text |
| Poke Ball spinner wobble | async states | static ball + text "LOADING…" |

No flashing above 3 Hz anywhere (WCAG 2.3.1). Sound: square-wave blips (move/confirm/back)
+ 3-note success jingle via WebAudio, generated in code (no audio assets), **muted by
default**, toggle in header persisted to localStorage, only ever after user gesture.

## 7. Accessibility (WCAG 2.2 AA — tested commitments)

- **1.1.1** Card images get alt: "Charizard · 4/102 · Rare Holo". Decorative pixels `aria-hidden`.
- **1.3.x** Semantic landmarks (`header/main/nav`), real `listbox/option/group` semantics in menus, labels on all controls.
- **1.4.1** No colour-only state: collected = Poke Ball icon + strikethrough number; reverse = "REV" badge.
- **1.4.3 / 1.4.11** Contrast enforced by unit test per theme (see §6).
- **1.4.4** Layout survives 200% zoom; rem-based sizing.
- **2.1.x** Full keyboard operation: arrow-key menus (roving tabindex), Enter/Space activate, Esc back, no traps; visible skip link.
- **2.2.x** No time limits; typewriter skippable; spinner states announced.
- **2.3.1** No >3 Hz flashing (cursor blink ~1.1 Hz).
- **2.4.7 / 2.4.11+** Focus always visible (▶ + outline), focus not obscured; tested.
- **2.5.8** Targets ≥ 24×24 CSS px (buttons ≥ 44px height).
- **3.2.x / 3.3.x** No focus-triggered context changes; errors as `role="alert"` GB dialogues with retry; zod messages humanized.
- **4.1.2 / 4.1.3** Radix-backed semantics; async status via `aria-live` regions.
- **Automated:** vitest-axe on every GB component + builder page states; Playwright `@axe-core/playwright`
  scans across all five themes; keyboard-only E2E completes the entire flow.

## 8. Print & PDF

- `/print/binder` — A4 portrait, `@page { size: A4; margin: 10mm }`, CSS grid `gap: 5mm`,
  one binder page per A4 sheet. Header: set symbol + name + "Page X/Y · rows×cols". Slot:
  card image (aspect 63:88 preserved), label below (name · number · rarity, 10pt). Reverse
  slots: corner "REV" badge. Empty pockets: dashed outline. Footer: Bindermon + config string.
- `/print/checklist` — table: tick box □, number, name, rarity, variant columns (Normal /
  Reverse where applicable); grouped 2 columns per page when narrow; page numbers.
- `/print/placeholders` — card-sized (63×88mm) cut-out placeholders with crop marks, set
  symbol, name, number, "REV" variant marks for master mode; for physically marking empty pockets.
- `printStyle=clean` (default): white background, black ink, system sans. `retro`: pixel faces,
  GB border decorations — still black-on-white ink-friendly.
- `POST /api/pdf` renders the matching route via `lib/pdf` (Puppeteer; `printBackground: true`;
  CSS margins; waits for all images settled) and streams the buffer.
- Browser-print fallback: the same routes are directly visitable; print CSS is identical.

## 9. Error handling & resilience

- **TCG client:** 25s timeout, 2 retries (1s/3s backoff), in-flight coalescing; errors surface
  as typed `TcgError { kind: 'timeout'|'http'|'network'|'parse' }`.
- **Cache:** stale-while-revalidate, corrupted cache files quarantined (delete + refetch);
  cache layer failures fall through to direct fetch.
- **UI:** React Query retries once; error → GB dialogue (`role="alert"`) with plain-language
  message + RETRY; empty search → MISSINGNO. easter-egg empty state. Set with zero cards →
  explanatory dialogue.
- **PDF:** route validates with zod (400 on bad config); render retry once; 60s timeout → 504
  with friendly message; concurrency overflow queues (p-limit) — UI shows spinner with
  "GENERATING…" live status; rate limiter returns 429 with retry-after.
- **Images:** proxy 404s → slot renders name/number placeholder tile instead of image
  (binder layout still usable); preview `next/image` `onError` same fallback.

## 10. Testing strategy

- **Unit (Vitest):** layout engine (sorting incl. TG/GG/suffix cases, variant expansion,
  pagination, presets, stats — the most heavily tested module); cache (TTL, LRU eviction, SWR,
  corruption recovery); TCG client (mocked fetch: pagination, retry, timeout, coalescing,
  variant derivation incl. heuristic fallback); contrast tokens per theme; checklist store.
- **Component (Vitest + RTL + vitest-axe):** every `gb/*` component — semantics, keyboard
  interaction (roving tabindex, Esc, Enter/Space), reduced-motion behaviour, axe clean;
  builder components with React Query + fixture data (select set → config → preview updates;
  URL sync; tick-off persistence).
- **E2E (Playwright, `TCG_DATA_SOURCE=fixture`):** full happy path (choose set → configure →
  preview → download all three PDFs — assert content-type, non-trivial size, and page count by
  parsing the PDF); keyboard-only full flow; axe scan per theme; reduced-motion emulation;
  print route visual snapshots (3 goldens); checklist tick persistence across reload.
- **PDF integration:** parse generated buffers (pdf page count == layout engine page count).
- **Static:** `tsc --noEmit` strict, ESLint (next + jsx-a11y), Prettier.
- **CI (GitHub Actions):** install → lint → typecheck → unit/component → build → e2e → docker build.

Fixtures: two real captured sets — `base1` (vintage, 102 cards, no reverses, holos) and
`sv1` (Scarlet & Violet base: 198 printed / 258 total, reverses + secret rares), trimmed to
the fields in §4.

## 11. Delivery & infrastructure

- **Local:** `pnpm dev` (fixture or live source via env), `.env.example` documenting
  `POKEMONTCG_API_KEY` (optional), `TCG_DATA_SOURCE`, `CACHE_DIR`, `PORT`.
- **Docker:** multi-stage Dockerfile (deps → build → slim runtime with Chromium +
  `PUPPETEER_EXECUTABLE_PATH`), non-root user, `docker-compose.yml` (single `web` service,
  cache volume). Image build verified in CI.
- **CI/CD:** `.github/workflows/ci.yml` as in §10; image push/VPS deploy steps included but
  commented with TODO-credentials (no registry/secrets exist yet — intentionally inert).
- **README:** setup, env, scripts, architecture sketch, screenshot.

## 12. Milestones (implementation order)

1. Scaffold: Next + TS strict + Tailwind + shadcn + Vitest/RTL + Playwright + lint; CI skeleton.
2. Theme system + contrast tests; fonts; base GB primitives (Screen, Button, DialogBox, Menu, Spinner, Progress, Toggle, Stepper, Badge, Toast).
3. `lib/cache` + `lib/tcg` (+fixtures) + API routes (sets, cards, img proxy).
4. `lib/layout` engine (TDD, exhaustive).
5. Builder UI: SetSelector → ConfigPanel → BinderPreview → checklist tick-off → ActionBar; URL state; React Query wiring; motion + sound.
6. Print routes + `lib/pdf` + `/api/pdf`; PDF integration tests.
7. E2E suite; axe sweeps; polish pass (animations, empty states, easter egg).
8. Docker + CI completion; README; final full-suite verification.

---

## v2 addendum (2026-06-12) — user feedback round 2

1. **Collection mode** (renames tick mode): toggle persisted in localStorage
   (`bindermon:v1:collection-mode`); collecting a card flies a pokeball ghost into the
   progress bar (bar pulses; reduced-motion: instant), collected pockets get a prominent
   mark (large pokeball + dimmed scan + struck number); CSV export (number, name, rarity,
   variant, collected) generated client-side.
2. **Holo badges + shimmer**: pockets for holo prints show a HOLO badge (mirrors REV);
   holographic cards get a subtle pixel shimmer sweep (motion-safe only, screen only).
3. **Ball-pattern master sets**: curated map (`lib/tcg/ball-patterns.ts`) marks sets with
   Poké Ball/Master Ball mirrors — sv8pt5 (PRE: poké = reverse pool, master = Pokémon only;
   481-card master set), zsv10pt5, rsv10pt5. The API exposes no per-card ball data
   (verified), so rules are per-set functions over (variants, supertype). Master mode gains
   toggles (SECRETS / POKÉ BALL / MASTER BALL) plus placement: INTERLEAVED (default) or
   AT END (grouped after the main run).
4. **Layout presets become pocket counts**: 4/9/12/16 PKT + CUSTOM (reveals row/col
   steppers). Default is the 12-pocket binder (3 rows × 4 cols).
5. **Binder finder**: once a set+layout is chosen, a section recommends matching Vault X
   binders (Zip/Strap lines in 4/9/12/16-pocket — verified lineup) with links to
   vaultx.com and Amazon search carrying an optional affiliate tag
   (`NEXT_PUBLIC_AMAZON_TAG`, `NEXT_PUBLIC_VAULTX_REF`); affiliate disclosure shown.
6. **Server-side store**: TCG data moves from fs-cache to SQLite (`node:sqlite`,
   `.cache/bindermon.db`) with per-key TTL + SWR — sets 24h, cards (incl. prices) **12h**.
   A daily in-process refresher (instrumentation.ts, skipped in fixture mode/tests) walks
   every set and re-caches; `POST /api/refresh` (localhost or `REFRESH_TOKEN`) triggers it
   manually. Image fs-cache unchanged.
