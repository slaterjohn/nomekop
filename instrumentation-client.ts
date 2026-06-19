import posthog from "posthog-js";
import { POSTHOG_API_HOST, POSTHOG_UI_HOST, posthogKey } from "@/lib/analytics/posthog";
import { installConsoleCapture } from "@/lib/analytics/console-capture";

// Client-side instrumentation. Runs AFTER the HTML loads but BEFORE React
// hydration (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
// instrumentation-client.md), so analytics is live as early as possible.
//
// Initialized opt-out-by-default: PostHog is set up here, but captures NOTHING
// (pageviews, autocaptured clicks, exceptions, console logs) until the user
// accepts the cookie-consent banner (components/analytics/cookie-consent.tsx).
// With an empty key (NEXT_PUBLIC_POSTHOG_KEY="") this is a no-op. Wrapped in
// try/catch, per the Next docs, so analytics can never break app startup.
const key = posthogKey();

if (key) {
  try {
    posthog.init(key, {
      api_host: POSTHOG_API_HOST, // same-origin /ingest → reverse-proxied (CSP- and ad-block-safe)
      ui_host: POSTHOG_UI_HOST,
      defaults: "2026-05-30", // PostHog's recommended defaults bundle (from the project's snippet)
      person_profiles: "always", // create profiles for anonymous visitors too (per the project's snippet)
      autocapture: true, // product analytics: button/link clicks, form submits, input changes
      capture_pageview: false, // web analytics: captured manually on real route changes — see posthog-pageview.tsx.
      // (The binder stashes share tokens in the URL via history.replaceState on every tweak; the dated `defaults`
      //  bundle would otherwise turn on history-based pageview autocapture and fire one on each tweak.)
      capture_pageleave: true, // keep page-leave events for time-on-page / bounce
      capture_exceptions: true, // Error Tracking: unhandled errors + unhandled promise rejections
      disable_session_recording: true, // analytics only — no session replay
      opt_out_capturing_by_default: true, // GDPR: capture nothing until the consent banner is accepted
    });
    installConsoleCapture(); // forward console.error/warn (also respects opt-out)
  } catch {
    // Analytics is best-effort — never let it break app startup.
  }
}
