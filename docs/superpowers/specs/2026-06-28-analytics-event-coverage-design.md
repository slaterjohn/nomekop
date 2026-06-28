# Comprehensive PostHog event coverage

**Date:** 2026-06-28
**Status:** Approved (design) — pending implementation plan

## Goal

Give the app meaningful, named analytics. Today PostHog captures only `$pageview`,
`$pageleave`, `$console_log`, and exceptions, plus generic `$autocapture` DOM
clicks. Autocapture's events are selector-based and carry no semantic meaning, so
funnels, feature-adoption, and conversion analysis are impossible. This adds a
comprehensive layer of **named, semantic custom events with structured
properties** for every meaningful user action across the app, on top of (not
replacing) autocapture, which stays on for the long tail.

Success: a product analyst can build the core funnels — land → search/browse →
choose a set/Pokémon/artist → configure a binder → export (PDF/print/share/CSV) —
and measure adoption of each feature area from named events alone.

## Current state (what exists)

- `lib/analytics/posthog.ts` — config: `posthogKey()`, `analyticsEnabled()`,
  hosts. Key can be `""` (disables analytics entirely — e2e/test builds).
- `instrumentation-client.ts` — `posthog.init(...)` with `autocapture: true`,
  `capture_pageview: false`, `capture_exceptions: true`,
  `opt_out_capturing_by_default: true`. Initialised opt-out; captures nothing
  until consent.
- `lib/analytics/consent.ts` — consent store; `grantConsent()` / `denyConsent()`
  wrap `posthog.opt_in_capturing()` / `opt_out_capturing()`.
- `components/analytics/posthog-pageview.tsx` — the single source of `$pageview`.
- `lib/analytics/console-capture.ts`, `app/global-error.tsx` — both import the
  `posthog` singleton directly and call it; the established pattern.

No custom `posthog.capture("<name>")` calls exist anywhere. No shared event
helper exists.

## Architecture

A single new module, `lib/analytics/events.ts`:

```ts
import posthog from "posthog-js";
import { analyticsEnabled } from "@/lib/analytics/posthog";

/** The canonical, typo-proof list of every custom event the app emits. */
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

type Props = Record<string, string | number | boolean | undefined>;

/** Capture a named event. No-op when analytics is disabled (empty key); a no-op
 *  in PostHog itself until the user grants consent (opt-out-by-default). Never
 *  throws — analytics is best-effort and must not break the app. */
export function capture(event: AnalyticsEvent, props?: Props): void {
  if (!analyticsEnabled()) return;
  try {
    posthog.capture(event, props);
  } catch {
    // best-effort
  }
}
```

Rationale:
- **Call-site captures**, not a button wrapper. A data-attribute `<button>` wrapper
  can't express typed properties and doesn't fit toggles, steppers, selects,
  keyboard nav, or async results (PDF success, share copy). The helper is called
  from each action's existing handler.
- **String-literal union** for event names: one canonical list, greppable, and a
  typo is a type error.
- **Singleton import**, matching `console-capture.ts` / `global-error.tsx` — no
  `usePostHog()` plumbing, works in any client component.
- **Consent-safe by construction**: `posthog.capture` is a no-op while opted out,
  so no per-call consent check is needed. **Disabled-key-safe**: the
  `analyticsEnabled()` guard means zero work (and no `posthog` calls) in test/e2e
  builds.

## Event taxonomy

snake_case; past tense for completed actions. To avoid event-name explosion,
config and settings changes are **single discriminated events** keyed by a
`field` / `setting` property.

### Binder builder
`components/builder/{builder,config-panel,action-bar,binder-preview,card-slot}.tsx`
and the Pokémon/illustrator binder views (`components/pokemon/pokemon-binder-view.tsx`,
`components/illustrator/illustrator-binder-view.tsx`).

| Event | Properties | Fires on |
|---|---|---|
| `binder_config_changed` | `field` (`grid`\|`mode`\|`secrets`\|`pokeball`\|`masterball`\|`energy`), `value`, `set` | grid preset / custom rows-cols / mode menu / secrets+pattern toggles |
| `binder_page_turned` | `direction` (`next`\|`prev`\|`first`\|`last`), `spread_index`, `spread_count`, `via` (`button`\|`keyboard`) | spread nav |
| `collection_mode_toggled` | `enabled`, `set` | collection-mode toggle |
| `card_marked` | `set`, `mode`, `kind`, `checked` | marking a pocket owned/unowned |
| `checklist_cleared` | `set`, `count` | confirmed "clear all" |
| `card_inspected` | `card_id`, `kind`, `set` | clicking a card → `/card/[id]` |

`binder_config_changed`'s `value` is the new value (e.g. `"3x3"`, `"master"`,
`true`). For the entity binder views, add `context` (`pokemon`\|`illustrator`) and
`slug` where the action is the same shape.

### Export
`components/builder/action-bar.tsx` (and entity-binder PDF/print buttons).

| Event | Properties |
|---|---|
| `pdf_downloaded` | `type` (`binder`\|`checklist`\|`placeholders`), `set`, `grid`, `context` |
| `pdf_download_failed` | `type`, `error` (message/status, no PII) |
| `print_opened` | `context` (`builder`\|`pokemon`\|`illustrator`) |
| `share_link_copied` | `context`, `set` |
| `csv_downloaded` | `set`, `collected_count` |
| `print_style_changed` | `style` (`retro`\|`clean`) |

### Search
`components/search/{site-search-box,site-search-dialog,search-results}.tsx`.

| Event | Properties | Notes |
|---|---|---|
| `search_opened` | `surface` (`dialog`\|`inline`), `scope` | ⌘K open or inline focus |
| `search_performed` | `query`, `query_length`, `scope`, `surface`, `result_count` | debounced ~400ms; `result_count: 0` covers the no-results case |
| `search_result_selected` | `query`, `result_type`, `scope`, `surface`, `position` | the key conversion event |

`scope` is `pokemon`\|`set`\|`artist`\|`global`. The debounce lives in the search
components (a small `useEffect` + timer on `query`), so we capture intent, not
keystrokes.

### Sets browser
`components/sets/sets-browser.tsx`, `components/sets/set-overlay-select.tsx`.

| Event | Properties |
|---|---|
| `set_opened` | `set`, `series`, `source` (`sets_browser`) |
| `series_toggled` | `series`, `expanded` |
| `set_overlay_language_changed` | `lang` |

### Directories & entities
`app/{pokemon,illustrator}/page.tsx`, `components/{pokemon,illustrator}/*-directory.tsx`,
`components/entities/{sort-tabs,entity-link}.tsx`, entity info pages.

| Event | Properties |
|---|---|
| `directory_sorted` | `directory` (`pokemon`\|`illustrator`), `sort` |
| `popular_entity_clicked` | `type` (`pokemon`\|`artist`), `name` |
| `entity_binder_started` | `type`, `slug` |
| `entity_link_clicked` | `from_type`, `to_type` |

### Settings & chrome
`components/settings/settings-panel.tsx`, `components/theme/theme-switcher.tsx`,
`components/music/music-toggle.tsx`.

| Event | Properties |
|---|---|
| `setting_changed` | `setting` (`language`\|`palette`\|`font`\|`text_size`\|`appearance`\|`sound`\|`reduce_motion`), `value` |
| `music_toggled` | `playing` |

### Consent & report
`lib/analytics/consent.ts`, `components/analytics/{cookie-consent,cookie-toggle}.tsx`,
`components/report/report-form.tsx`.

| Event | Properties | Notes |
|---|---|---|
| `consent_set` | `decision` (`granted`\|`denied`), `surface` (`banner`\|`settings`) | only `granted` transmits (see Privacy) |
| `report_submitted` | `era`, `set`, `issue` | **never** name/email/message |
| `report_submit_failed` | `reason` | |

## Privacy & consent

- **No PII.** `report_submitted` carries only `era`/`set`/`issue`. The reporter's
  name, email, and free-text message are never sent. Autocapture already masks
  text-input values, so typed report fields are not captured generically either.
- **Search query** *is* captured (`query`). A search box is not a personal field,
  and the search term is the single most valuable search metric. Accepted risk.
- **`consent_set: denied` does not transmit.** A user who denies is opted out, so
  PostHog drops the event. This is correct: denial rate is inferred from
  (banner shown) − (granted). `consent_set: granted` is added to `grantConsent()`
  immediately after `opt_in_capturing()`, alongside the existing `$pageview`.

## Testing (TDD)

- `test/unit/analytics-events.test.ts` — `capture()`: no-op when
  `NEXT_PUBLIC_POSTHOG_KEY=""` (assert `posthog.capture` not called); calls
  through with the given name+props when enabled; never throws if `posthog.capture`
  throws. `posthog-js` mocked.
- Per-area tests mock the `@/lib/analytics/events` module and assert the action
  fires `capture` with the right event name and properties. Where a component
  test already exists (search, settings-panel, sets), extend it; otherwise add a
  focused one. Pure handlers (e.g. csv/share) are tested directly.
- Existing suite stays green; full `pnpm test`, `pnpm typecheck`, `pnpm lint`,
  and a fixture-mode `pnpm build` before commit.

## Scope boundaries (out of scope)

- Print **server** pages (`app/print/*`) stay `$pageview`-only — no client events.
- No `posthog.identify` / user identification; no person-properties (e.g.
  stashing binder config on the profile). Anonymous events only.
- No new consent UI, no session recording (stays disabled), no changes to the
  pageview or exception capture already in place.
- No A/B testing or feature flags.

## File-by-file instrumentation map (summary)

| File | Events added |
|---|---|
| `lib/analytics/events.ts` | **new** — `capture` + `AnalyticsEvent` |
| `components/builder/builder.tsx` | `collection_mode_toggled`, `checklist_cleared`, `csv_downloaded` |
| `components/builder/config-panel.tsx` | `binder_config_changed` |
| `components/builder/binder-preview.tsx` | `binder_page_turned` |
| `components/builder/card-slot.tsx` | `card_marked`, `card_inspected` |
| `components/builder/action-bar.tsx` | `pdf_downloaded`, `pdf_download_failed`, `print_opened`, `share_link_copied`, `print_style_changed` |
| `components/pokemon/pokemon-binder-view.tsx`, `components/illustrator/illustrator-binder-view.tsx` | binder/export events with `context`+`slug` |
| `components/search/site-search-box.tsx`, `site-search-dialog.tsx`, `search-results.tsx` | `search_opened`, `search_performed`, `search_result_selected` |
| `components/sets/sets-browser.tsx`, `set-overlay-select.tsx` | `set_opened`, `series_toggled`, `set_overlay_language_changed` |
| `app/pokemon/page.tsx`, `app/illustrator/page.tsx`, directories, `sort-tabs.tsx` | `directory_sorted`, `popular_entity_clicked` |
| entity info pages, `entity-link.tsx` | `entity_binder_started`, `entity_link_clicked` |
| `components/settings/settings-panel.tsx`, `theme-switcher.tsx`, `music-toggle.tsx` | `setting_changed`, `music_toggled` |
| `lib/analytics/consent.ts`, `cookie-toggle.tsx` | `consent_set` |
| `components/report/report-form.tsx` | `report_submitted`, `report_submit_failed` |

Server-component pages that need a client handler (popular chips, sort tabs,
entity CTAs, directory rows) get a tiny client wrapper or an `onClick` on an
existing client component — no page is converted wholesale to a client component.
