# Bindermon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Bindermon — a Game Boy-styled Pokemon TCG binder-layout web app with set selection, grid configuration, master-set variant interleaving, an animated accessible preview, and printable A4 PDFs (binder pages, checklist, placeholders).

**Architecture:** Single Next.js App Router app. Pure layout engine (`lib/layout`) consumed by both the interactive preview and `/print/*` routes; Puppeteer renders those same routes to PDF. TCG API behind a `CardDataSource` interface (live pokemontcg.io / committed fixtures) with layered memory+fs TTL cache. No external stores.

**Tech Stack:** Next.js (latest, App Router) · TypeScript strict · Tailwind v4 · shadcn/ui (Radix) · React Query v5 · zod · Vitest + RTL + vitest-axe · Playwright + @axe-core/playwright · Puppeteer · pdf-lib (tests) · p-limit · pnpm.

**Spec:** `docs/superpowers/specs/2026-06-11-bindermon-design.md` — §ref'd throughout.

**Conventions for every task:** TDD (test first where logic exists), run `pnpm test` scoped to the new file, commit after each green task with a conventional message ending in the Claude co-author trailer. All components: semantic HTML, keyboard support, axe-clean. Touch nothing in `node_modules`. Never weaken `tsconfig` strictness.

---

### Task 1: Scaffold Next.js app

**Files:** Create: entire app skeleton via CLI; Modify: `next.config.ts`, `package.json`, `.gitignore`, `tsconfig.json`.

- [ ] **Step 1.1:** From `/Users/johnslater/bindermon` run:
  `pnpm create next-app@latest . --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-pnpm` (accept defaults for anything else; if it refuses a non-empty dir because of `docs/`, run in a temp dir and `rsync` contents back excluding `.git`).
- [ ] **Step 1.2:** In `next.config.ts` add `output: 'standalone'` and `images.remotePatterns` for `images.pokemontcg.io`.
- [ ] **Step 1.3:** In `tsconfig.json` confirm `"strict": true`; add `"noUncheckedIndexedAccess": true`.
- [ ] **Step 1.4:** Verify: `pnpm dev` serves localhost page (curl 200), `pnpm build` succeeds, `pnpm lint` passes.
- [ ] **Step 1.5:** Commit `chore: scaffold next.js app`.

### Task 2: Test infrastructure

**Files:** Create: `vitest.config.ts`, `vitest.setup.ts`, `test/unit/smoke.test.tsx`, `playwright.config.ts`, `e2e/smoke.spec.ts`, `.prettierrc`; Modify: `package.json` scripts, `eslint.config.mjs` (add `jsx-a11y` recommended).

- [ ] **Step 2.1:** `pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom vitest-axe @playwright/test @axe-core/playwright prettier eslint-plugin-jsx-a11y`
- [ ] **Step 2.2:** `vitest.config.ts`: react plugin, `environment: 'jsdom'`, `setupFiles: ['./vitest.setup.ts']`, include `test/**/*.test.{ts,tsx}`, alias `@` → root. `vitest.setup.ts`: import `@testing-library/jest-dom/vitest`; `expect.extend` from `vitest-axe/matchers`; polyfill `matchMedia` + `ResizeObserver` + `IntersectionObserver` (jsdom lacks them).
- [ ] **Step 2.3:** Smoke test renders `<h1>hi</h1>`, asserts text + `await axe(container)` has no violations. Run `pnpm vitest run` → PASS.
- [ ] **Step 2.4:** `playwright.config.ts`: testDir `e2e`, chromium project only, `webServer: { command: 'pnpm start -p 3105', port: 3105, env: { TCG_DATA_SOURCE: 'fixture', IMG_STUB: '1' }, reuseExistingServer: !process.env.CI }` (build runs in CI before e2e; locally run `pnpm build` first). `e2e/smoke.spec.ts`: home page responds, `<main>` visible. `pnpm exec playwright install chromium`.
- [ ] **Step 2.5:** Scripts: `"test": "vitest run"`, `"test:watch": "vitest"`, `"e2e": "playwright test"`, `"typecheck": "tsc --noEmit"`, `"check": "pnpm lint && pnpm typecheck && pnpm test"`. Add jsx-a11y to eslint config. Run `pnpm check` → green (e2e deferred until routes exist).
- [ ] **Step 2.6:** Commit `chore: vitest, playwright, axe, lint infrastructure`.

### Task 3: shadcn/ui init

**Files:** Create: `components.json`, `lib/utils.ts`, `components/ui/*` (command, dialog, tooltip, sonner via CLI).

- [ ] **Step 3.1:** `pnpm dlx shadcn@latest init -d` then `pnpm dlx shadcn@latest add command dialog tooltip sonner`.
- [ ] **Step 3.2:** Verify `pnpm check` still green; commit `chore: shadcn init + base primitives`.

### Task 4: Theme system + contrast tests (spec §6 palettes)

**Files:** Create: `lib/themes.ts`, `test/unit/contrast.test.ts`, `components/theme/theme-provider.tsx`, `components/theme/theme-script.tsx`, `components/theme/theme-switcher.tsx` (placeholder consuming GbMenu later — initial version native `<select>` restyled), `test/unit/theme.test.tsx`; Modify: `app/globals.css`, `app/layout.tsx`.

- [ ] **Step 4.1 (failing test first):** `lib/themes.ts` data + `test/unit/contrast.test.ts`:

```ts
// lib/themes.ts
export type ThemeId = 'dmg' | 'pocket' | 'kanto-red' | 'cerulean' | 'high-contrast';
export type Theme = {
  id: ThemeId; label: string;
  /** dark → light */
  shades: [string, string, string, string];
};
export const THEMES: Theme[] = [
  { id: 'dmg',           label: 'Game Boy',      shades: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'] },
  { id: 'pocket',        label: 'Pocket',        shades: ['#000000', '#555555', '#aaaaaa', '#e8e8e8'] },
  { id: 'kanto-red',     label: 'Kanto Red',     shades: ['#2d0a0a', '#7a1f1f', '#d98c8c', '#f3e3e3'] },
  { id: 'cerulean',      label: 'Cerulean',      shades: ['#0a1a2d', '#1f4a7a', '#8cb4d9', '#e3edf3'] },
  { id: 'high-contrast', label: 'High Contrast', shades: ['#000000', '#333333', '#cccccc', '#ffffff'] },
];
export const DEFAULT_THEME: ThemeId = 'dmg';
// Roles: ink = shades[0] (all text), muted = shades[1] (large text/borders only),
//        accent = shades[2] (fills/decor; ink text allowed on top), bg = shades[3].
```

```ts
// test/unit/contrast.test.ts
import { THEMES } from '@/lib/themes';
import { contrastRatio } from '@/lib/contrast';
import { describe, it, expect } from 'vitest';
describe.each(THEMES)('theme $id meets WCAG AA', (t) => {
  const [ink, muted, accent, bg] = t.shades;
  it('ink on bg ≥ 4.5:1', () => expect(contrastRatio(ink, bg)).toBeGreaterThanOrEqual(4.5));
  it('ink on accent ≥ 4.5:1', () => expect(contrastRatio(ink, accent)).toBeGreaterThanOrEqual(4.5));
  it('muted on bg ≥ 3:1 (large text/UI only)', () => expect(contrastRatio(muted, bg)).toBeGreaterThanOrEqual(3));
  it('focus indicator (ink) vs bg ≥ 3:1', () => expect(contrastRatio(ink, bg)).toBeGreaterThanOrEqual(3));
});
```

```ts
// lib/contrast.ts
function channel(v: number): number { const s = v / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }
export function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`bad hex: ${hex}`);
  const n = parseInt(m[1]!, 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
```

Run `pnpm vitest run test/unit/contrast.test.ts` → expect FAIL (modules missing) → create files → PASS (all 20 assertions; hand-verified: tightest pairs are dmg ink/accent ≈ 5.0 and dmg muted/bg ≈ 3.2).
- [ ] **Step 4.2:** `globals.css`: emit CSS vars per `[data-theme='<id>']` (`--gb-ink/--gb-muted/--gb-accent/--gb-bg`) — hand-write from `THEMES` values with a comment pointing at `lib/themes.ts` as source of truth (contrast test guards drift); map into Tailwind v4 `@theme inline` tokens (`--color-ink` etc.). Default block on `:root` = dmg.
- [ ] **Step 4.3:** `theme-script.tsx`: inline `<script>` (dangerouslySetInnerHTML) reading `localStorage['bindermon:v1:theme']` pre-hydration, setting `document.documentElement.dataset.theme` (FOUC guard). `theme-provider.tsx`: client context `{theme, setTheme}` persisting to the same key. Wire both in `app/layout.tsx`.
- [ ] **Step 4.4:** `theme.test.tsx`: provider defaults to `dmg`, `setTheme('pocket')` updates `data-theme` + localStorage. PASS.
- [ ] **Step 4.5:** Commit `feat: five GB palettes with CI-enforced WCAG contrast`.

### Task 5: Fonts, global GB styles, app shell

**Files:** Modify: `app/layout.tsx`, `app/globals.css`, `app/page.tsx` (placeholder shell); Create: `components/gb/gb-screen.tsx`, `test/unit/gb-screen.test.tsx`.

- [ ] **Step 5.1:** `next/font/google`: Press Start 2P (`--font-pixel`, weight 400) + VT323 (`--font-body`). Tailwind tokens: `font-pixel`, `font-body`. Base styles: `body { @apply bg-bg text-ink font-body text-xl }` (VT323 ≥18px), headings `font-pixel`, global `:focus-visible` outline 2px ink offset 2.
- [ ] **Step 5.2:** Skip link as first element of body (`href="#main"`, visually hidden until focused), `<main id="main">`.
- [ ] **Step 5.3:** `GbScreen`: section wrapper — 4px ink border, 2px accent inner edge, bg surface, optional `title` rendered as pixel-font caption bar, dot-matrix texture via CSS `background-image: radial-gradient(...)` opacity ≤ 0.04, `aria-hidden` decoration only. Test: renders children + title, axe clean.
- [ ] **Step 5.4:** Reduced-motion global CSS: `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }` plus `lib/use-reduced-motion.ts` hook (matchMedia listener) for JS-driven motion.
- [ ] **Step 5.5:** `pnpm check`; commit `feat: pixel fonts, GB screen frame, skip link, reduced-motion base`.

### Task 6: GbButton, GbStepper, GbBadge, GbToggle

**Files:** Create: `components/gb/gb-button.tsx`, `gb-stepper.tsx`, `gb-badge.tsx`, `gb-toggle.tsx` + `test/unit/gb-controls.test.tsx`.

- [ ] **Step 6.1 (tests first):** GbButton: renders `<button>`, variants `a|b|plain`, min-h 44px class present, press class on `:active` (style assertion via class), disabled state, axe. GbStepper: labelled group with − / + buttons and `role="spinbutton"` value display, `aria-valuemin/max/now`, ArrowUp/Down adjust, min/max clamp, onChange fires. GbToggle: wraps Radix Switch (shadcn) restyled, labelled, Space toggles, axe. GbBadge: `<span>` with `aria-label` passthrough.
- [ ] **Step 6.2:** Implement: chunky 3px ink borders, accent fill for variant `a`, surface for `b`; `active:translate-x-px active:translate-y-px` press depth; `motion-safe:transition-transform`. Stepper buttons are GbButtons size sm (still ≥24px target, ≥44px height per spec).
- [ ] **Step 6.3:** `pnpm vitest run test/unit/gb-controls.test.tsx` PASS; commit `feat: GB buttons, stepper, toggle, badge`.

### Task 7: GbMenu — roving-tabindex listbox with ▶ cursor

**Files:** Create: `components/gb/gb-menu.tsx`, `test/unit/gb-menu.test.tsx`.

- [ ] **Step 7.1 (failing tests):**

```tsx
// API: <GbMenu label="Collection mode" value={v} onChange={fn}
//        options={[{value:'standard',label:'STANDARD'},{value:'master',label:'MASTER',hint:'reverse holos interleaved'}]} />
it('has listbox semantics with labelled options', ...);            // role=listbox, aria-label, role=option, aria-selected
it('moves focus with ArrowDown/ArrowUp and wraps', ...);            // roving tabindex: exactly one option tabIndex=0
it('Home/End jump to first/last', ...);
it('Enter and Space select the focused option', ...);
it('shows ▶ cursor on the focused option only (aria-hidden)', ...);
it('axe clean', ...);
```

- [ ] **Step 7.2:** Implement roving tabindex: state `activeIndex`; each option `tabIndex={i===activeIndex?0:-1}`; onKeyDown switch (ArrowDown/Up wrap via modulo, Home, End, Enter/Space → onChange); focus follows activeIndex via refs; `▶` span `aria-hidden` rendered when `i===activeIndex` (blink animation `motion-safe:animate-gb-blink`, keyframes 1.1Hz steps — define `--animate-gb-blink` in globals); selection shown with filled accent row + `aria-selected`.
- [ ] **Step 7.3:** PASS + axe; commit `feat: GbMenu roving-tabindex listbox with cursor focus indicator`.

### Task 8: GbDialogBox (typewriter), GbSpinner, GbProgress

**Files:** Create: `components/gb/gb-dialog-box.tsx`, `gb-spinner.tsx`, `gb-progress.tsx`, `lib/use-typewriter.ts`, `test/unit/gb-feedback.test.tsx`.

- [ ] **Step 8.1 (tests):** Typewriter (fake timers): reveals incrementally; click/Enter skips to full; `useReducedMotion → instant`; sr-only span always holds FULL text with `aria-live="polite"` while animated span is `aria-hidden`. GbDialogBox: double-border box, `role` configurable (`alert` for errors), optional `onContinue` shows blinking ▼ (aria-hidden). GbSpinner: `role="status"` + visible label (default `LOADING…`), pokeball div animates `motion-safe` only. GbProgress: `role="progressbar"` + `aria-valuenow/min/max` + visible `n/m` fraction, HP-bar fill width %, color NOT sole indicator (fraction text always). All axe clean.
- [ ] **Step 8.2:** Implement. Typewriter hook:

```ts
export function useTypewriter(text: string, speedMs = 18) {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(reduced ? text.length : 0);
  useEffect(() => { setCount(reduced ? text.length : 0); }, [text, reduced]);
  useEffect(() => {
    if (count >= text.length) return;
    const t = setTimeout(() => setCount(c => Math.min(c + 1, text.length)), speedMs);
    return () => clearTimeout(t);
  }, [count, text, speedMs]);
  return { display: text.slice(0, count), done: count >= text.length, skip: () => setCount(text.length) };
}
```

- [ ] **Step 8.3:** PASS; commit `feat: GB dialog box with skippable typewriter, spinner, HP-bar progress`.

### Task 9: Cache layer (spec §3 lib/cache)

**Files:** Create: `lib/cache/index.ts`, `test/unit/cache.test.ts`.

- [ ] **Step 9.1 (tests, fake timers + `fs.mkdtemp`):** memory hit avoids compute; TTL expiry triggers SWR (stale value returned immediately, refresh fires once — assert compute called once more after `await vi.waitFor`); fs layer survives new MemoryCache instance (simulates restart); LRU evicts beyond 50; corrupted fs JSON → quarantined (file deleted, compute re-runs); in-flight coalescing (two concurrent getOrCompute → one compute); compute error with stale present → stale returned, error swallowed (logged); compute error w/o stale → rejects with typed error.
- [ ] **Step 9.2:** Implement:

```ts
export interface CacheStore { getOrCompute<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T>; }
type Entry = { value: unknown; expiresAt: number };
export class LayeredCache implements CacheStore {
  private mem = new Map<string, Entry>();           // Map iteration order = LRU
  private inflight = new Map<string, Promise<unknown>>();
  constructor(private dir: string, private maxMem = 50) {}
  // getOrCompute: fresh mem → return; else fs read (JSON {value,expiresAt}) → seed mem;
  // fresh → return; stale → return stale AND fire-and-forget refresh (guarded by inflight);
  // miss → await refresh. refresh(): inflight-deduped compute, then set mem (LRU: delete+set,
  // evict first key past maxMem) + atomic fs write (tmp+rename) under sha1(key).json.
  // fs errors are non-fatal (cache degrades to memory/direct).
}
export const tcgCache = new LayeredCache(process.env.CACHE_DIR ?? '.cache/tcg');
```

Full implementation ~90 lines; key detail: `refresh` stores `expiresAt = Date.now() + ttlMs`; quarantine = `unlink` on JSON.parse failure.
- [ ] **Step 9.3:** PASS; commit `feat: layered memory+fs cache with SWR and coalescing`.

### Task 10: TCG data layer + fixtures (spec §4)

**Files:** Create: `lib/tcg/types.ts`, `lib/tcg/variants.ts`, `lib/tcg/pokemontcgio.ts`, `lib/tcg/fixture-source.ts`, `lib/tcg/index.ts` (source selection), `scripts/capture-fixtures.mjs`, `test/fixtures/sets.json`, `test/fixtures/cards-base1.json`, `test/fixtures/cards-sv1.json`, `test/unit/variants.test.ts`, `test/unit/tcg-client.test.ts`.

- [ ] **Step 10.1:** `types.ts` exactly per spec §4 (`TcgSet`, `TcgCard`, `Variants`). No imports.
- [ ] **Step 10.2 (tests):** `variants.test.ts`: prices `{normal,reverseHolofoil}` → both true; `{holofoil}` → holo only; `{1stEditionHolofoil,unlimitedHolofoil}` → normal(unlimited)+holo; absent prices + 1999 release → no reverse; absent + 2023 + Common + number 5/198 → reverse true; absent + 2023 + secret 250/198 → reverse false; prefixed `TG01` → reverse false.
- [ ] **Step 10.3:** Implement `deriveVariants(prices, {releaseDate, printedTotal, number, rarity})` per spec §4 heuristic (era ≥2002, plain numeric ≤ printedTotal, rarity ∈ {Common, Uncommon, Rare, Rare Holo}). Number parsing here is a tiny local regex `(^[A-Za-z]*)(\d+)([a-z]*$)` — the full comparator lives in lib/layout (no dependency from tcg → layout).
- [ ] **Step 10.4 (tests):** `tcg-client.test.ts` with `vi.stubGlobal('fetch', ...)`: maps sets fields incl. images.symbol/logo; paginates cards (totalCount 460 → 2 calls pageSize 250) and concatenates; sends `X-Api-Key` when env set; retries on 500 then succeeds (backoff mocked via vi.useFakeTimers); times out via AbortController → TcgError kind 'timeout' after retries; JSON garbage → kind 'parse'. FixtureSource: returns 2 sets' cards, throws helpful error for unknown set, image URLs preserved.
- [ ] **Step 10.5:** Implement `PokemonTcgIoSource` (BASE `https://api.pokemontcg.io/v2`, timeout 25_000, retries 2 backoff [1000, 3000], maps → types via `deriveVariants`), `FixtureSource` (sync JSON imports), `index.ts`:

```ts
export function getDataSource(): CardDataSource {
  return process.env.TCG_DATA_SOURCE === 'fixture' ? new FixtureSource() : new PokemonTcgIoSource();
}
export const getSets = () => tcgCache.getOrCompute('sets', DAY, () => getDataSource().getSets());
export const getCards = (setId: string) => tcgCache.getOrCompute(`cards:${setId}`, DAY, () => getDataSource().getCards(setId));
```

- [ ] **Step 10.6:** `capture-fixtures.mjs`: node script hitting live API (sets list trimmed to spec fields; cards for base1 + sv1 trimmed) writing the three fixture files; run it once (`node scripts/capture-fixtures.mjs`), eyeball sizes (sets ~all sets, cards 102 + 258 entries). Commit fixtures.
- [ ] **Step 10.7:** PASS all; commit `feat: TCG data source (live+fixture) with variant derivation and captured fixtures`.

### Task 11: API routes — sets, cards, image proxy

**Files:** Create: `app/api/sets/route.ts`, `app/api/cards/[setId]/route.ts`, `app/api/img/route.ts`, `public/card-stub.png` (via `scripts/make-stub-png.mjs`), `test/unit/api-routes.test.ts`.

- [ ] **Step 11.1 (tests, call handlers directly with `new Request(...)` / route params, env `TCG_DATA_SOURCE=fixture`):** GET sets → 200 JSON array with id/name/series; GET cards/base1 → 102 cards; GET cards/unknown → 502 with `{error}` envelope (typed TcgError mapping: timeout→504, http→502, parse→502, network→503... keep mapping table in route); img proxy: rejects non-allowlisted host (400), rejects invalid URL (400); with `IMG_STUB=1` returns the stub PNG bytes + `image/png` regardless of src (no network in tests).
- [ ] **Step 11.2:** Implement routes (thin: parse → lib call → NextResponse.json, `Cache-Control: public, max-age=300, stale-while-revalidate=86400`). Img proxy: allowlist `images.pokemontcg.io`; disk cache at `.cache/img/<sha1>`; streams upstream body; 1y immutable cache header; `IMG_STUB=1` short-circuits to `public/card-stub.png`.
- [ ] **Step 11.3:** `make-stub-png.mjs` writes a 63×88 two-tone PNG using `zlib.deflateSync` raw scanlines (no deps); run once, commit binary.
- [ ] **Step 11.4:** PASS; commit `feat: sets/cards/img API routes with stub mode`.

### Task 12: Layout engine + config schema (spec §5)

**Files:** Create: `lib/layout/number.ts`, `lib/layout/expand.ts`, `lib/layout/paginate.ts`, `lib/layout/index.ts`, `lib/config.ts`, `test/unit/number.test.ts`, `test/unit/expand.test.ts`, `test/unit/paginate.test.ts`, `test/unit/layout-integration.test.ts`, `test/unit/config.test.ts`.

- [ ] **Step 12.1 (number tests):**

```ts
expect(parseCardNumber('4')).toEqual({ prefix: '', num: 4, suffix: '' });
expect(parseCardNumber('85a')).toEqual({ prefix: '', num: 85, suffix: 'a' });
expect(parseCardNumber('TG01')).toEqual({ prefix: 'TG', num: 1, suffix: '' });
expect(parseCardNumber('SV001')).toEqual({ prefix: 'SV', num: 1, suffix: '' });
expect(parseCardNumber('ONE')).toBeNull();
// sort: shuffled ['100','2','85a','GG02','TG01','1','85','10','GG01','TG02'] →
// ['1','2','10','85','85a','100','GG01','GG02','TG01','TG02']; unparseable last, stable.
```

- [ ] **Step 12.2:** Implement `parseCardNumber` (regex `/^([A-Za-z]*)(\d+)([a-z]*)$/`), `compareCardNumbers` (unprefixed before prefixed; prefix localeCompare; num; suffix), `sortCards` (stable; nulls last). PASS.
- [ ] **Step 12.3 (expand tests):** standard → one `{kind:'card'}` slot per card; master → reverse-variant cards followed immediately by `{kind:'reverse', card}` (adjacency assertion); `includeSecrets:false` drops numeric > printedTotal AND prefixed; suffix `85a` with base ≤ printedTotal retained. Implement `expandSlots(cards, mode, includeSecrets, printedTotal)`. PASS.
- [ ] **Step 12.4 (paginate tests):** 7 slots in 3×3 → 1 page of 9 (2 trailing `{kind:'empty'}`); 10 → 2 pages; 18 → exactly 2 pages; 0 slots → 0 pages; spreads: 5 pages → `[[null,1],[2,3],[4,5]]` (page numbers; first page sits right). stats `{cards, slots, pages, slotsPerPage}` where slots excludes empty padding. Implement `paginate(slots, rows, cols)` + `toSpreads(pages)`. PASS.
- [ ] **Step 12.5 (integration on fixtures):** base1 standard 3×3 → stats `{cards:102, slots:102, pages:12}`; base1 master → identical (vintage: no reverses — guards the heuristic); sv1 standard+secrets 3×3 → 258 slots/29 pages; sv1 master → `slots === 258 + countReverse(fixture)` and every reverse slot's predecessor is its normal sibling; sv1 secrets-off → max numeric ≤ 198. PASS via `buildBinderLayout(cards, set, config)` facade in `lib/layout/index.ts`.
- [ ] **Step 12.6 (config):** `lib/config.ts` zod schema: `set` string, `rows/cols` coerce int 1–5 default 3, `mode` enum default 'standard', `secrets` '0'/'1'→boolean default true, `style` enum('clean','retro') default 'clean'; `parseConfig(searchParams)` (safe: invalid → defaults per-field via `.catch()`), `serializeConfig(config)` → URLSearchParams (omits defaults). Tests: roundtrip, clamping `rows=9`→3 (catch default), garbage tolerated. PASS.
- [ ] **Step 12.7:** Commit `feat: pure binder layout engine (sort, variants, pagination, spreads) + config schema`.

### Task 13: React Query + SetSelector

**Files:** Create: `components/providers.tsx` (QueryClientProvider), `components/builder/set-selector.tsx`, `lib/hooks.ts` (`useSets`, `useCards`), `test/unit/set-selector.test.tsx`; Modify: `app/layout.tsx`.

- [ ] **Step 13.1 (tests, msw-free: mock `lib/hooks` fetchers via QueryClient + `vi.spyOn(global, 'fetch')` returning fixture JSON):** renders grouped-by-series options from sets; typing filters (cmdk built-in); ArrowDown+Enter selects a set → `onSelect(set)`; combobox semantics labelled "CHOOSE SET"; set symbol `<img alt="">` decorative; loading state shows GbSpinner; error state shows GbDialogBox role=alert with RETRY button that refetches; axe clean.
- [ ] **Step 13.2:** Implement on shadcn `Command` (`shouldFilter` default), restyled GB: pixel caption "CHOOSE SET", rows show symbol + name + `printedTotal/total`, ▶ via `data-selected` styling, group headings = series. `useSets` = React Query `['sets']` fetching `/api/sets` (staleTime 1h, retry 1).
- [ ] **Step 13.3:** PASS; commit `feat: GB-styled searchable set selector`.

### Task 14: ConfigPanel + URL state

**Files:** Create: `components/builder/config-panel.tsx`, `lib/use-binder-config.ts`, `test/unit/config-panel.test.tsx`.

- [ ] **Step 14.1 (tests):** `useBinderConfig` (wrap `useSearchParams`+`useRouter` — test via a harness component in a `MemoryRouter`-less Next mock: stub `next/navigation` with vi.mock providing controllable searchParams + router.replace spy): updates push URL (replace, no scroll), parse uses `lib/config`. ConfigPanel: steppers labelled ROWS/COLS clamp 1–5; preset chips 2×2/3×3/4×3/4×4 set both (assert via spy); GbMenu collection mode standard/master with hint text; secrets GbToggle; stats line text `“X cards → Y slots → Z pages”` recomputed from layout engine on fixture data; axe.
- [ ] **Step 14.2:** Implement; stats line uses `buildBinderLayout` directly (pure, cheap memo). Mode explainer in a GbDialogBox (typewriter, polite).
- [ ] **Step 14.3:** PASS; commit `feat: binder configuration panel with URL-synced state`.

### Task 15: BinderPreview (spreads, page flip, badges)

**Files:** Create: `components/builder/binder-preview.tsx`, `components/builder/card-slot.tsx`, `test/unit/binder-preview.test.tsx`.

- [ ] **Step 15.1 (tests, fixture cards):** renders current spread only (± neighbors in DOM, others absent — perf guard); page nav buttons + Left/Right arrows change spread; nav has `aria-label="Binder pages"` + live region announcing "Pages 2–3 of 12"; REV slots show GbBadge "REV"; empty slots are presentational dashed pockets (`aria-hidden`); card slot has `alt` `"Charizard · 4/102 · Rare Holo"`; image `loading="lazy"`; image error → name/number tile fallback (text visible); reduced-motion: no flip class (hook mocked); axe clean.
- [ ] **Step 15.2:** Implement: spread = 2 page grids (`grid-template-columns: repeat(cols, 1fr)`, gap, aspect-ratio 63/88 cells); flip animation: `motion-safe` CSS 3D rotateY on spread change (state `flipping` class, 280ms, then swap — skip entirely under reduced motion); deal-in: stagger `animation-delay: i*22ms` fade/translate `motion-safe`; page nav GbButtons (◀ ▶) + "page X–Y / Z" pixel label; keyboard handlers on the region (`role="group"`).
- [ ] **Step 15.3:** PASS; commit `feat: binder spread preview with page flip and lazy card images`.

### Task 16: Checklist tick-off (localStorage)

**Files:** Create: `lib/checklist-store.ts`, `test/unit/checklist.test.ts`; Modify: `components/builder/binder-preview.tsx` + its test (tick mode), `components/builder/` add `checklist-progress.tsx`.

- [ ] **Step 16.1 (tests):** store: toggle/has/count/clear roundtrip on key `bindermon:v1:checklist:<setId>:<mode>`; slot key = `${cardId}:${kind}`; quota/SSR errors swallowed (mock localStorage throwing); React hook `useChecklist` returns reactive set + counts. Preview tick mode: clicking a card slot (or Space when focused — slots become `role="checkbox"` `aria-checked` buttons in tick mode) toggles pokeball mark + number strikethrough (mark has `aria-hidden`, state carried by aria-checked); GbProgress shows `n/m COLLECTED`; persists across remount.
- [ ] **Step 16.2:** Implement store + hook (useSyncExternalStore over a tiny emitter so multiple components stay in sync) + preview integration (TICK MODE GbToggle in preview header).
- [ ] **Step 16.3:** PASS; commit `feat: collection checklist tick-off with localStorage persistence`.

### Task 17: Sound, header, page assembly, empty/error states

**Files:** Create: `lib/sound.ts`, `components/header.tsx` (wordmark, theme switcher via GbMenu in a popover-free inline row, sound toggle), `components/builder/action-bar.tsx` (buttons stubbed: PDF buttons disabled-with-tooltip until Task 19 wires them; Print links live), `components/builder/builder.tsx` (composition + GbWipe section reveal), `components/gb/gb-wipe.tsx`, `components/missingno.tsx`, `test/unit/sound.test.ts`, `test/unit/builder.test.tsx`; Modify: `app/page.tsx` (server component: prefetch sets → hydrate builder).

- [ ] **Step 17.1 (tests):** sound: muted by default; `setMuted(false)` persists `bindermon:v1:sound`; `play('confirm')` no-ops when muted (AudioContext never constructed — assert via stubbed ctor), creates osc when unmuted. builder.test: with fixture sets — initial state shows only CHOOSE SET; selecting set reveals CONFIG + PREVIEW (wipe `motion-safe` class, content present immediately for AT); empty cards set → MISSINGNO dialog (role=status, text mentions no cards); API error → role=alert RETRY; full page axe.
- [ ] **Step 17.2:** Implement `lib/sound.ts` (lazy AudioContext on first unmuted play, square osc, freqs move 440/confirm 660/back 330, success arpeggio [523,659,784] 90ms, gain 0.03); header: BINDERMON pixel wordmark with one-time staggered letter reveal (`motion-safe`, CSS only), theme GbMenu (5 themes), sound GbToggle "SOUND". Wire `play('move')` into GbMenu focus moves + `play('confirm')` into selections (via optional SoundContext — components accept `onCue` so the design system stays sound-agnostic... simplest: a `useSound()` hook consumed inside Gb components is forbidden — keep coupling OUT of gb/*: Builder passes handlers).
- [ ] **Step 17.3:** Assemble `app/page.tsx`: server component calls `getSets()` (fixture/live per env) → `<Builder initialSets={...} />`; metadata (title "Bindermon — Pokemon binder layout maker", description, themeColor dmg bg).
- [ ] **Step 17.4:** PASS + `pnpm check`; commit `feat: assembled builder page with sound, header, wipe transitions, empty states`.

### Task 18: Print routes (spec §8)

**Files:** Create: `app/print/binder/page.tsx`, `app/print/checklist/page.tsx`, `app/print/placeholders/page.tsx`, `components/print/print-binder.tsx`, `components/print/print-checklist.tsx`, `components/print/print-placeholders.tsx`, `components/print/print-shell.tsx`, `app/print/print.css`, `test/unit/print-components.test.tsx`.

- [ ] **Step 18.1 (tests, render print components with fixture layout):** binder: one `.print-page` per layout page, header has set name + "Page X/Y · 3×3", slot label "name · number · rarity", REV corner badge text, empty pockets dashed div, img src goes through `/api/img?src=`; checklist: one row per card, master mode adds Reverse column with `□` only where variant exists, page chunks of 28 rows; placeholders: one 63×88mm cell per slot with crop marks + set symbol + number, `style=retro` adds pixel-font class on shell; clean is default (no pixel class).
- [ ] **Step 18.2:** Implement. `print.css`: `@page { size: A4; margin: 10mm }`, `.print-page { page-break-after: always; display: grid; gap: 5mm }`, `@media screen` preview chrome (gray bg, centered white pages) so the routes are previewable in-browser; black-on-white always. Pages are **server components** reading `searchParams` → `parseConfig` → `getCards`/`getSets` → `buildBinderLayout` → render. `style=retro` swaps font classes + GB double-border header only.
- [ ] **Step 18.3:** Manual verify: `TCG_DATA_SOURCE=fixture pnpm dev` → `curl -s localhost:3000/print/binder?set=base1 | grep -c print-page` → 12. PASS tests; commit `feat: A4 print routes for binder, checklist, placeholders`.

### Task 19: PDF pipeline (spec §3/§8)

**Files:** Create: `lib/pdf.ts`, `app/api/pdf/route.ts`, `lib/rate-limit.ts`, `test/integration/pdf.test.ts` (vitest, **node** environment, longer timeout), `test/unit/rate-limit.test.ts`; Modify: `components/builder/action-bar.tsx` (+test) to POST and download.

- [ ] **Step 19.1:** `pnpm add puppeteer p-limit zod && pnpm add -D pdf-lib`
- [ ] **Step 19.2 (rate-limit tests):** token bucket: 5 burst, refill 1/10s (fake timers), per-key isolation, `consume()` boolean. Implement (~25 lines, Map<ip,{tokens,last}>).
- [ ] **Step 19.3:** `lib/pdf.ts` (per spec contract): browser singleton with relaunch-on-crash, `pLimit(3)`, 1 retry, 60s nav timeout, `waitUntil: 'networkidle0'` + `document.fonts.ready`, `page.pdf({ format: 'A4', printBackground: true })` (margins from @page), `baseUrl()` = `http://127.0.0.1:${process.env.PORT ?? 3000}`. Sandbox args only when `PUPPETEER_NO_SANDBOX=1`.
- [ ] **Step 19.4:** `app/api/pdf/route.ts`: zod body `{type: enum, config}` → 400 invalid; rate limit by `x-forwarded-for|'local'` → 429; maps to `/print/<type>?<serializeConfig>`; returns PDF with attachment filename `bindermon-<set>-<type>.pdf`; errors → 504/502 GB-friendly `{error}`.
- [ ] **Step 19.5 (integration test):** spawn `pnpm build && PORT=3199 TCG_DATA_SOURCE=fixture IMG_STUB=1 pnpm start` (test global-setup; or `execa` in beforeAll with readiness poll), POST /api/pdf binder base1 3×3 → 200, `application/pdf`, `PDFDocument.load(buffer).getPageCount() === 12`; checklist sv1 → ≥ 10 pages; placeholders base1 master → page count equals layout engine prediction; invalid rows=9 → still 200 with clamped default (catch) — and `type:'nope'` → 400. Mark with `describe.skipIf(!!process.env.SKIP_PDF_IT)` for emergencies; CI runs it.
- [ ] **Step 19.6:** ActionBar: three GbButtons POST via fetch → blob → `URL.createObjectURL` download anchor; pending = GbSpinner + aria-live "GENERATING…"; failure = GbToast (sonner restyled) with retry; PRINT button = `<a target="_blank" href="/print/binder?...">`. RTL test: mocks fetch blob, asserts anchor download invoked, busy state announced, error toast on 500.
- [ ] **Step 19.7:** PASS; commit `feat: puppeteer PDF generation with rate limiting and download UX`.

### Task 20: E2E suite (spec §10)

**Files:** Create: `e2e/flow.spec.ts`, `e2e/keyboard.spec.ts`, `e2e/a11y.spec.ts`, `e2e/print.spec.ts`, `e2e/helpers.ts`; Modify: `playwright.config.ts` (projects: default + `reduced-motion` using `contextOptions.reducedMotion: 'reduce'`), `package.json` (`"e2e": "pnpm build && playwright test"` via pretest script or document `pnpm build` first).

- [ ] **Step 20.1:** Route-stub `images.pokemontcg.io/**` → `public/card-stub.png` in helpers (preview path; print/PDF path already stubbed server-side by IMG_STUB).
- [ ] **Step 20.2:** `flow.spec.ts`: open / → search "Scarlet" → select sv1 → set 4×3 via steppers → MASTER mode → stats text matches engine → preview shows REV badge → flip two spreads → tick 3 cards → progress "3/…" → reload → still ticked → download binder PDF via `page.request.post` (page count assert with pdf-lib) → checklist + placeholders PDFs 200.
- [ ] **Step 20.3:** `keyboard.spec.ts`: complete the same core path using ONLY keyboard (Tab/Arrows/Enter/Space; skip-link first Tab lands "Skip to content"); assert focus visible on each stop (`:focus-visible` outline or ▶ present via `data-active`).
- [ ] **Step 20.4:** `a11y.spec.ts`: for each of 5 themes (set via localStorage init script): AxeBuilder scan home (initial + configured states) → zero violations; reduced-motion project: select set → no element carries `data-flipping` during nav; typewriter text instant (full text immediately).
- [ ] **Step 20.5:** `print.spec.ts`: /print/binder?set=base1 has 12 `.print-page`; checklist row count 102; placeholders cell count == slots; `toHaveScreenshot` golden of binder page 1 (`test.skip(process.env.CI && process.platform !== 'darwin')` — DOM assertions cover CI; goldens generated locally darwin).
- [ ] **Step 20.6:** `pnpm build && pnpm e2e` all green; commit `test: full e2e coverage — flow, keyboard-only, axe per theme, print`.

### Task 21: Polish pass

**Files:** Modify: `app/globals.css`, `components/*` (micro-interactions), `app/icon.svg` (pixel pokeball favicon), `app/layout.tsx` (metadata/theme-color), `components/gb/gb-kbd-hint.tsx` (+ render in builder), MISSINGNO art tune-up.

- [ ] **Step 21.1:** KbdHint bar (`▲▼ NAVIGATE · ENTER SELECT · ESC BACK`, hidden on touch via `@media (hover:none)`, `aria-hidden` since it duplicates real semantics). Favicon: hand-written 16×16 pixel pokeball SVG (rects). Title-bar wordmark reveal QA. Hover/active states sweep on all interactive elements. Verify cursor blink ≈1.1Hz (steps(2) 0.9s).
- [ ] **Step 21.2:** Re-run FULL suite `pnpm check && pnpm build && pnpm e2e`; fix fallout; commit `polish: kbd hints, favicon, micro-interactions`.

### Task 22: Docker, CI, README, final verification

**Files:** Create: `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `.github/workflows/ci.yml`, `README.md`, `.env.example`.

- [ ] **Step 22.1:** Multi-stage Dockerfile: `node:24-slim` base; corepack enable; deps (pnpm fetch w/ `PUPPETEER_SKIP_DOWNLOAD=true`); build (`pnpm build`, standalone); runtime: `apt-get install -y chromium fonts-liberation`, env `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium PUPPETEER_NO_SANDBOX=1 NODE_ENV=production PORT=3000`, copy `.next/standalone` + `.next/static` + `public`, non-root `node` user, `CMD ["node","server.js"]`. Compose: service `web`, ports 3000, volume `bindermon-cache:/app/.cache`, env file. Verify `docker build .` completes and `docker run` serves / + generates a PDF (fixture env).
- [ ] **Step 22.2:** `ci.yml`: on push/PR — pnpm setup w/ cache → install → lint → typecheck → unit (`pnpm test`) → build → `playwright install --with-deps chromium` → e2e → `docker build` (no push). Commented-out `deploy` job scaffold with registry/VPS TODO-credentials note per spec §11.
- [ ] **Step 22.3:** README: what/why, screenshot, quickstart (fixture mode zero-config), env table from `.env.example` (`POKEMONTCG_API_KEY`, `TCG_DATA_SOURCE`, `CACHE_DIR`, `IMG_STUB`, `PORT`, `PUPPETEER_*`), scripts, architecture sketch, a11y statement, print/PDF notes.
- [ ] **Step 22.4:** Final: `pnpm check && pnpm build && pnpm e2e` + docker verification; commit `chore: docker, CI, README`; final review pass with superpowers:verification-before-completion before declaring done.

---

## Self-review (coverage vs spec)

- §1 features → Tasks 10/12 (Musts: sets, grid, interleave, API), 18/19 (printouts Must), 16 (checklist Should), 12.6+14 (presets Could), 18 placeholders (Could). ✓
- §3 modules each have a dedicated task; §4 types Task 10; §5 engine Task 12; §6 design system Tasks 4–8, 13–17, 21; §7 a11y woven into every component task + Task 20 sweeps; §8 print/PDF Tasks 18–19; §9 resilience Tasks 9/10/11/19; §10 testing Tasks 2/12/19/20; §11 delivery Task 22; §12 order == task order. ✓
- Placeholder scan: deploy-job TODO-credentials is an intentional spec'd inert scaffold (§11), not a plan gap. ✓
- Type consistency: `Slot.kind = 'card'|'reverse'|'empty'` used in 12/15/18; `BinderConfig` field names (`set, rows, cols, mode, secrets, style`) consistent in 12.6/14/18/19; `bindermon:v1:*` storage keys consistent in 4/16/17. ✓
