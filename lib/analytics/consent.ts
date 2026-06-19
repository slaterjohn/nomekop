"use client";

import { useSyncExternalStore } from "react";
import posthog from "posthog-js";

// Cookie-consent state, backed by PostHog's own persisted opt-in/out decision.
// PostHog is initialized opt-out-by-default, so NOTHING is captured (pageviews,
// autocapture clicks, exceptions, console logs) until the user accepts. The
// decision persists across visits, so the banner is shown only while "pending".
//
// Exposed as an external store (the project's pattern for client-only varying
// state — no setState-in-effect): the server snapshot reports a decided state so
// the client-only banner never renders during SSR (no flash, no hydration
// mismatch); after hydration the real status drives it.

export type ConsentStatus = "granted" | "denied" | "pending";

const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function getSnapshot(): ConsentStatus {
  try {
    const status = posthog.get_explicit_consent_status();
    return status === "granted" || status === "denied" ? status : "pending";
  } catch {
    return "pending";
  }
}

// SSR / hydration: pretend a decision was made so the banner is purely client-side.
function getServerSnapshot(): ConsentStatus {
  return "granted";
}

export function useConsentStatus(): ConsentStatus {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Accept: start capturing and record the current page (its pageview was suppressed). */
export function grantConsent(): void {
  try {
    posthog.opt_in_capturing();
    posthog.capture("$pageview");
  } catch {
    // best-effort
  }
  emit();
}

/** Deny (also the close button): stay opted out; nothing is captured. */
export function denyConsent(): void {
  try {
    posthog.opt_out_capturing();
  } catch {
    // best-effort
  }
  emit();
}
