"use client";

import { Suspense, type ReactNode } from "react";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { analyticsEnabled } from "@/lib/analytics/posthog";
import { PostHogPageView } from "@/components/analytics/posthog-pageview";
import { CookieConsent } from "@/components/analytics/cookie-consent";

/**
 * Shares the PostHog client with the React tree (so `usePostHog` works) and
 * mounts the manual pageview tracker. PostHog itself is initialized earlier in
 * `instrumentation-client.ts`; this just wires up the same singleton.
 *
 * When no key is configured it's a transparent pass-through — zero overhead and
 * no posthog calls at all.
 */
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  if (!analyticsEnabled()) return <>{children}</>;

  return (
    <PostHogProvider client={posthog}>
      {/* First in the tree → renders above the header and is the first focusable element. */}
      <CookieConsent />
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PostHogProvider>
  );
}
