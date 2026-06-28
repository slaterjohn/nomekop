# Analytics Event Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a comprehensive layer of named, semantic PostHog events (with structured properties) for every meaningful user action across the app.

**Architecture:** A single guarded helper `capture(event, props)` in `lib/analytics/events.ts` wrapping `posthog.capture`, called from each action's existing handler. Consent-safe by construction (PostHog opt-out-by-default → `capture` is a no-op until granted) and disabled-key-safe (`analyticsEnabled()` guard). Event names are a string-literal union.

**Tech Stack:** Next.js 16 App Router, posthog-js, vitest + @testing-library/react, pnpm.

## Global Constraints

- **No PII in events.** `report_submitted` carries only `era`/`set`/`issue` — never name, email, or message.
- **Never throw from analytics.** `capture()` is wrapped in try/catch.
- **No-op when disabled.** `capture()` returns early when `analyticsEnabled()` is false (empty `NEXT_PUBLIC_POSTHOG_KEY`).
- **Event names** are snake_case, past-tense, and must exist in the `AnalyticsEvent` union — a typo is a type error.
- **No page converted wholesale to a client component.** Server pages get a tiny client wrapper or an `onClick` on an existing client child.
- **Verification gates before each commit where code changed:** `pnpm typecheck`, relevant `pnpm test`. Full `pnpm test` + `pnpm lint` + fixture-mode `pnpm build` before the final commit.
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## File Structure

- **Create** `lib/analytics/events.ts` — `capture()` + `AnalyticsEvent` union (the canonical event list).
- **Create** `test/unit/analytics-events.test.ts` — helper unit tests.
- **Modify** (add `capture()` calls): search (3 files), builder (5 files), entity binder views (2), sets (2), directories/entities (~5), settings/chrome (3), consent (2), report (1).
- Test pattern for instrumented components: `vi.mock("@/lib/analytics/events", () => ({ capture: vi.fn() }))`, trigger the action, assert `capture` called with `(name, objectContaining(props))`.

---

### Task 1: The `capture()` helper

**Files:**
- Create: `lib/analytics/events.ts`
- Test: `test/unit/analytics-events.test.ts`

**Interfaces:**
- Produces: `export type AnalyticsEvent = "binder_config_changed" | "binder_page_turned" | "collection_mode_toggled" | "card_marked" | "checklist_cleared" | "card_inspected" | "pdf_downloaded" | "pdf_download_failed" | "print_opened" | "share_link_copied" | "csv_downloaded" | "print_style_changed" | "search_opened" | "search_performed" | "search_result_selected" | "set_opened" | "series_toggled" | "set_overlay_language_changed" | "directory_sorted" | "popular_entity_clicked" | "entity_binder_started" | "entity_link_clicked" | "setting_changed" | "music_toggled" | "consent_set" | "report_submitted" | "report_submit_failed";`
- Produces: `export function capture(event: AnalyticsEvent, props?: Record<string, string | number | boolean | undefined>): void`

- [ ] **Step 1: Write the failing test** (`test/unit/analytics-events.test.ts`)

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

const phCapture = vi.fn();
vi.mock("posthog-js", () => ({ default: { capture: (...a: unknown[]) => phCapture(...a) } }));

import { capture } from "@/lib/analytics/events";

afterEach(() => {
  vi.unstubAllEnvs();
  phCapture.mockReset();
});

describe("capture", () => {
  it("forwards the event name and props to posthog when enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    capture("search_performed", { query: "pika", result_count: 3 });
    expect(phCapture).toHaveBeenCalledWith("search_performed", { query: "pika", result_count: 3 });
  });

  it("is a no-op when analytics is disabled (empty key)", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    capture("search_performed", { query: "pika" });
    expect(phCapture).not.toHaveBeenCalled();
  });

  it("never throws if posthog.capture throws", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    phCapture.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    expect(() => capture("music_toggled", { playing: true })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test, verify it fails** — `npx vitest run test/unit/analytics-events.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement** (`lib/analytics/events.ts`)

```ts
// Named, semantic product-analytics events. A thin guarded wrapper over
// posthog.capture: a no-op when analytics is disabled (empty key) and — because
// PostHog is opt-out-by-default — a no-op in PostHog until the user grants
// consent, so no per-call consent check is needed. Never throws.
import posthog from "posthog-js";
import { analyticsEnabled } from "@/lib/analytics/posthog";

/** Every custom event the app emits. snake_case, past tense. */
export type AnalyticsEvent =
  | "binder_config_changed"
  | "binder_page_turned"
  | "collection_mode_toggled"
  | "card_marked"
  | "checklist_cleared"
  | "card_inspected"
  | "pdf_downloaded"
  | "pdf_download_failed"
  | "print_opened"
  | "share_link_copied"
  | "csv_downloaded"
  | "print_style_changed"
  | "search_opened"
  | "search_performed"
  | "search_result_selected"
  | "set_opened"
  | "series_toggled"
  | "set_overlay_language_changed"
  | "directory_sorted"
  | "popular_entity_clicked"
  | "entity_binder_started"
  | "entity_link_clicked"
  | "setting_changed"
  | "music_toggled"
  | "consent_set"
  | "report_submitted"
  | "report_submit_failed";

type EventProps = Record<string, string | number | boolean | undefined>;

export function capture(event: AnalyticsEvent, props?: EventProps): void {
  if (!analyticsEnabled()) return;
  try {
    posthog.capture(event, props);
  } catch {
    // best-effort — analytics must never break the app
  }
}
```

- [ ] **Step 4: Run test, verify it passes.**
- [ ] **Step 5: Commit** — `git add lib/analytics/events.ts test/unit/analytics-events.test.ts && git commit` ("Add guarded capture() analytics helper").

---

### Task 2: Search events

**Files:**
- Modify: `components/search/site-search-box.tsx`, `components/search/site-search-dialog.tsx`, `components/search/search-results.tsx`
- Test: extend `test/unit/site-search.test.tsx`

**Interfaces:**
- Consumes: `capture` from Task 1.
- `SearchResults` gains a prop `onSelect: (url: string, item: SearchEntry, position: number) => void` so the selecting component can capture `result_type`/`position`. (Currently `onSelect: (url: string) => void`.)

**Call sites:**
- `site-search-box.tsx`: in `onFocus` → `capture("search_opened", { surface: "inline", scope: scope ?? "global" })` (once per open — guard with a ref so it fires on transition to open, not every focus). Debounced effect on `query` (~400ms, skip empty) → `capture("search_performed", { query, query_length: query.trim().length, scope: scope ?? "global", surface: "inline", result_count: groups.reduce((n,g)=>n+g.items.length,0) })`. In `go()` → it receives `(url, item, position)` → `capture("search_result_selected", { query, result_type: item.type, scope: scope ?? "global", surface: "inline", position })`.
- `site-search-dialog.tsx`: when `setOpen(true)` (button click and ⌘K) → `capture("search_opened", { surface: "dialog", scope: "global" })`. Debounced `search_performed` with `surface: "dialog"`, `scope: "global"`. `go()` → `search_result_selected` with `surface: "dialog"`.
- `search-results.tsx`: thread `item` + index into `onSelect`: `onSelect={() => onSelect(item.url, item, idx)}` (map index available).

- [ ] **Step 1: Write failing tests** (append to `test/unit/site-search.test.tsx`)

```ts
// at top, alongside existing mocks:
vi.mock("@/lib/analytics/events", () => ({ capture: vi.fn() }));
import { capture } from "@/lib/analytics/events";
// in beforeEach: (capture as unknown as vi.Mock).mockClear?.() — or vi.mocked(capture).mockClear();

it("captures search_result_selected with the result type", () => {
  render(<SiteSearchBox />);
  type("pika");
  fireEvent.click(screen.getByText("Pikachu"));
  expect(vi.mocked(capture)).toHaveBeenCalledWith(
    "search_result_selected",
    expect.objectContaining({ result_type: "pokemon", scope: "global", surface: "inline" }),
  );
});

it("captures search_performed (debounced) with result_count", async () => {
  vi.useFakeTimers();
  render(<SiteSearchBox scope="pokemon" />);
  type("pika");
  vi.advanceTimersByTime(450);
  vi.useRealTimers();
  expect(vi.mocked(capture)).toHaveBeenCalledWith(
    "search_performed",
    expect.objectContaining({ query: "pika", scope: "pokemon", surface: "inline" }),
  );
});
```

- [ ] **Step 2: Run, verify fail** (`onSelect` signature mismatch / no capture).
- [ ] **Step 3: Implement** the call sites above. Add a debounce `useEffect` in each search component:

```ts
useEffect(() => {
  const q = query.trim();
  if (!q) return;
  const id = window.setTimeout(() => {
    capture("search_performed", {
      query: q,
      query_length: q.length,
      scope: scope ?? "global",      // dialog uses "global"
      surface: "inline",              // dialog uses "dialog"
      result_count: groups.reduce((n, g) => n + g.items.length, 0),
    });
  }, 400);
  return () => window.clearTimeout(id);
}, [query, scope, groups]);
```

Update `SearchResults` `onSelect` signature and the `Command.Item` `onSelect` to pass `(item.url, item, idx)`; update both `go()` callers.

- [ ] **Step 4: Run tests, verify pass.** Watch the existing 8 search tests stay green.
- [ ] **Step 5: Commit** ("Instrument search: opened / performed / result_selected").

---

### Task 3: Binder builder events

**Files:**
- Modify: `components/builder/config-panel.tsx`, `components/builder/binder-preview.tsx`, `components/builder/card-slot.tsx`, `components/builder/builder.tsx`
- Test: `test/unit/config-panel.test.tsx`, `test/unit/builder.test.tsx`, `test/unit/card-slot.test.tsx` (extend existing)

**Call sites:**
- `config-panel.tsx`:
  - Preset onClick → `capture("binder_config_changed", { field: "grid", value: \`${preset.rows}x${preset.cols}\`, set: set.id })`.
  - Custom onClick → `capture("binder_config_changed", { field: "grid", value: "custom", set: set.id })`.
  - Rows/Cols steppers `onChange` → `capture("binder_config_changed", { field: "grid", value: \`${rows}x${config.cols}\` / \`${config.rows}x${cols}\`, set: set.id })`.
  - Mode `GbMenu.onChange` → `capture("binder_config_changed", { field: "mode", value: mode, set: set.id })`.
  - Secrets toggle → `field: "secrets", value: secrets`. Poké Ball → `field: "pokeball", value: pb`. Master Ball → `field: "masterball", value: mb`. Energy → `field: "energy", value: ep`. (`set: set.id` on each.)
- `binder-preview.tsx`: in `go(n)` add `via` param; button clicks pass `"button"`, keyboard handler passes `"keyboard"` → `capture("binder_page_turned", { direction, spread_index: clamped, spread_count: spreads.length, via })` where `direction` is `next`/`prev`/`first`/`last`.
- `card-slot.tsx`: `onToggle` path → `capture("card_marked", { set: <from props/context>, mode: <>, kind: slot.kind, checked: tick.checked })`. `onInspect` path → `capture("card_inspected", { card_id: card.id, kind: slot.kind, set: <> })`. (If `set`/`mode` aren't in scope at the slot, thread them from the parent that already knows them — check `builder.tsx` render of `CardSlot`.)
- `builder.tsx`: collection-mode `GbToggle.onChange(on)` → `capture("collection_mode_toggled", { enabled: on, set: config.set })`. Confirmed clear → `capture("checklist_cleared", { set: config.set, count: <count before clear> })`. CSV download → `capture("csv_downloaded", { set: config.set, collected_count: checklist.collected.size })`.

- [ ] **Step 1: Write failing tests.** Example (config-panel):

```ts
vi.mock("@/lib/analytics/events", () => ({ capture: vi.fn() }));
import { capture } from "@/lib/analytics/events";

it("captures binder_config_changed when a pocket preset is chosen", () => {
  render(<ConfigPanel set={SET} cards={CARDS} config={CONFIG} onChange={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "3×3" }));
  expect(vi.mocked(capture)).toHaveBeenCalledWith(
    "binder_config_changed",
    expect.objectContaining({ field: "grid", set: SET.id }),
  );
});
```

(Reuse each test file's existing fixtures for `SET`/`CARDS`/`CONFIG`; read the file first to match them.)

- [ ] **Step 2-4:** Run→fail, implement each call site, run→pass.
- [ ] **Step 5: Commit** ("Instrument binder builder: config / page nav / card mark / clear / csv").

---

### Task 4: Export events (action-bar)

**Files:**
- Modify: `components/builder/action-bar.tsx`
- Test: `test/unit/action-bar.test.tsx` (extend)

**Call sites (action-bar.tsx):**
- In `download(type)`, on success (after `play("success")`) → `capture("pdf_downloaded", { type, set: config.set, grid: \`${config.rows}x${config.cols}\` })`. In the catch → `capture("pdf_download_failed", { type, error: err instanceof Error ? err.message : "unknown" })`.
- Print button onClick → `capture("print_opened", { context: "builder" })`.
- Share button: after successful `clipboard.writeText` → `capture("share_link_copied", { context: "builder", set: config.set })`.
- Retro toggle `onChange(retro)` → `capture("print_style_changed", { style: retro ? "retro" : "clean" })`.

- [ ] **Step 1: Write failing tests** (mock `events`; mock `fetch` for the PDF success path; mock `navigator.clipboard.writeText`).

```ts
it("captures print_opened when Print is clicked", () => {
  const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
  render(<ActionBar config={CONFIG} onStyleChange={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: /print/i }));
  expect(vi.mocked(capture)).toHaveBeenCalledWith("print_opened", { context: "builder" });
  openSpy.mockRestore();
});
```

- [ ] **Step 2-4:** fail → implement → pass.
- [ ] **Step 5: Commit** ("Instrument export: pdf / print / share / print_style").

---

### Task 5: Entity binder views (Pokémon / illustrator)

**Files:**
- Modify: `components/pokemon/pokemon-binder-view.tsx`, `components/illustrator/illustrator-binder-view.tsx`
- Test: extend the matching existing tests if present, else add focused ones.

**Call sites:** the same shapes as Tasks 3-4 (config/page-turn/card-mark/pdf/print/share) but add `context: "pokemon"|"illustrator"` and `slug` to each props object. Read each file first; mirror the builder call sites. PDF/print/share reuse `pdf_downloaded`/`print_opened`/`share_link_copied` with the added `context`+`slug`.

- [ ] **Step 1-5:** TDD per call site (test pattern identical to Task 3-4 with `context`/`slug` assertions); commit ("Instrument entity binder views").

---

### Task 6: Sets browser events

**Files:**
- Modify: `components/sets/sets-browser.tsx`, `components/sets/set-overlay-select.tsx`
- Test: add `test/unit/sets-browser.test.tsx` (none exists yet) + extend overlay test if present.

**Call sites:**
- `sets-browser.tsx`: `onOpen(set)` (plain-left-click in `SetGrid`) → `capture("set_opened", { set: set.id, series: set.series, source: "sets_browser" })`. `CollapsibleSeries` toggle → `capture("series_toggled", { series: group.series, expanded: !open })`.
- `set-overlay-select.tsx`: language change → `capture("set_overlay_language_changed", { lang })`.

- [ ] **Step 1: Write failing test** (new `test/unit/sets-browser.test.tsx`):

```ts
vi.mock("@/lib/analytics/events", () => ({ capture: vi.fn() }));
import { capture } from "@/lib/analytics/events";
// render SetsBrowser with a minimal groups+labels fixture; click a set tile (plain left click)
it("captures set_opened when a set tile opens the modal", () => {
  render(<SetsBrowser groups={GROUPS} labels={LABELS} />);
  fireEvent.click(screen.getByText(/BASE SET/i));
  expect(vi.mocked(capture)).toHaveBeenCalledWith(
    "set_opened",
    expect.objectContaining({ set: "base1", source: "sets_browser" }),
  );
});
```

(Build `GROUPS`/`LABELS` fixtures from the `SetsGroup`/`SetsBrowserLabels` types.)

- [ ] **Step 2-5:** fail → implement → pass → commit ("Instrument sets browser: set_opened / series_toggled / overlay language").

---

### Task 7: Directories & entity links

**Files:**
- Modify: `components/entities/sort-tabs.tsx` (sort), `app/pokemon/page.tsx` + `app/illustrator/page.tsx` (popular chips), entity info CTAs (`components/pokemon/pokemon-info.tsx`, `components/illustrator/illustrator-info.tsx`), `components/entities/entity-link.tsx` (cross-links). Directory rows (`*-directory.tsx`) → `popular_entity_clicked` is for the popular chips only; directory-row clicks are covered by autocapture + pageview (keep scope tight; do NOT instrument every row).
- Test: extend `test/unit/entity-directory.test.tsx` / add focused tests for the client wrappers.

**Call sites:**
- `sort-tabs.tsx` (already a client component): on tab click → `capture("directory_sorted", { directory, sort })`. Add a `directory` prop passed by each page (`"pokemon"`/`"illustrator"`).
- Popular chips: the chips are `GbLinkButton`s in server pages. Wrap them in a tiny client component `PopularChip` (or add an existing client wrapper) that calls `capture("popular_entity_clicked", { type, name })` onClick before navigation. `type` = `"pokemon"`/`"artist"`.
- Entity info "Build a … binder" CTA: it's a `GbLinkButton` in a (likely server) info component — add a client `onClick` wrapper → `capture("entity_binder_started", { type, slug })`.
- `entity-link.tsx`: on click → `capture("entity_link_clicked", { from_type, to_type })`. `to_type` is the link's own type; `from_type` is passed by the renderer (faq/fact/pokemon/artist page). If `from_type` isn't readily available, default it to `"prose"`.

- [ ] **Step 1-5:** TDD each; the new client wrappers each get a focused render+click test asserting `capture`. Commit ("Instrument directories & entity cross-links").

---

### Task 8: Settings & chrome

**Files:**
- Modify: `components/settings/settings-panel.tsx`, `components/theme/theme-switcher.tsx`, `components/music/music-toggle.tsx`
- Test: extend `test/unit/settings-panel.test.tsx`, `test/unit/theme.test.tsx`, `test/unit/music.test.ts`/related.

**Call sites:** one discriminated event.
- `settings-panel.tsx`: language → `capture("setting_changed", { setting: "language", value: code })`; font → `setting: "font"`; text size → `setting: "text_size"`; appearance → `setting: "appearance"`; sound toggle → `setting: "sound", value: on`; reduce-motion → `setting: "reduce_motion", value: reduced`.
- `theme-switcher.tsx`: palette pick → `capture("setting_changed", { setting: "palette", value: t.id })`.
- `music-toggle.tsx`: toggle → `capture("music_toggled", { playing })`.

- [ ] **Step 1: Write failing test** (settings-panel, reusing its existing open-dialog pattern):

```ts
it("captures setting_changed when reduce-motion is toggled", async () => {
  render(<SettingsPanel />);
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  fireEvent.click(await screen.findByRole("switch", { name: "Reduce animation" }));
  expect(vi.mocked(capture)).toHaveBeenCalledWith(
    "setting_changed",
    expect.objectContaining({ setting: "reduce_motion" }),
  );
});
```

- [ ] **Step 2-5:** fail → implement → pass → commit ("Instrument settings & music").

---

### Task 9: Consent & report

**Files:**
- Modify: `lib/analytics/consent.ts`, `components/analytics/cookie-toggle.tsx`, `components/report/report-form.tsx`
- Test: add/extend `test/unit/report-action.test.ts` or a focused report-form render test; consent covered by a focused test on `grantConsent`.

**Call sites:**
- `consent.ts` `grantConsent()`: after `posthog.opt_in_capturing()` and the existing `$pageview`, add `posthog.capture("consent_set", { decision: "granted", surface })`. Add a `surface: "banner" | "settings"` param (default `"banner"`); `cookie-toggle.tsx` passes `"settings"`. `denyConsent()`: call `capture("consent_set", { decision: "denied", surface })` BEFORE `opt_out_capturing()` won't transmit anyway — per spec, denial is intentionally not transmitted; do NOT add a pre-opt-out capture (keep deny silent, matching the spec). So only the granted path emits.
- `report-form.tsx`: on a successful submit (form state → `"sent"`) → `capture("report_submitted", { era, set, issue })` (NO name/email/message). On error state → `capture("report_submit_failed", { reason: <state: "error"|"unconfigured"> })`.

- [ ] **Step 1: Write failing tests** (consent: mock posthog, call `grantConsent("settings")`, assert `posthog.capture("consent_set", { decision: "granted", surface: "settings" })`; report: render form, drive to sent state, assert `capture("report_submitted", …)` with no email field).
- [ ] **Step 2-5:** fail → implement → pass → commit ("Instrument consent grant & report submit").

---

### Task 10: Full verification & ship

- [ ] **Step 1:** `pnpm typecheck` → clean.
- [ ] **Step 2:** `pnpm lint` → no new errors.
- [ ] **Step 3:** `pnpm test` → all green.
- [ ] **Step 4:** `TCG_DATA_SOURCE=fixture pnpm build` → compiles.
- [ ] **Step 5:** Final commit if anything outstanding; push to `main` (excluding `.claude/`); manual Dokploy deploy (`application-deploy`, appId `Sqb3YhWyQU5xJk1c7JTJB`); verify on `www.nomekop.app` that events fire (PostHog Activity, or DevTools network to `/ingest` after granting consent).

---

## Self-Review

**Spec coverage:** Every taxonomy row maps to a task — search (T2), builder (T3), export (T4), entity binders (T5), sets (T6), directories/entities (T7), settings/chrome (T8), consent/report (T9), helper (T1), verify/ship (T10). ✓

**Placeholders:** Call sites give exact event names + props. Where a fixture must match an existing test, the plan says "read the file first" and reuse its fixtures — this is a real instruction, not a deferral, because the assertion (event name + props) is fully specified.

**Type consistency:** `capture(event, props)` signature and the `AnalyticsEvent` union are fixed in T1 and used verbatim throughout. `SearchResults.onSelect` widened to `(url, item, position)` in T2 and both callers updated. `consent_set` only emitted on the granted path (deny stays silent, per spec).
