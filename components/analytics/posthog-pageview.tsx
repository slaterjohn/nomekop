"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";

/**
 * Captures a `$pageview` on the initial load and on every real route change.
 *
 * Keyed on the App Router's pathname/searchParams — deliberately NOT on raw
 * history.replaceState (which the binder uses to keep share tokens in the URL on
 * every tweak), because Next doesn't surface those through these hooks, so token
 * edits don't spam pageviews. `capture_pageview` is disabled in init; this is the
 * single source of pageviews.
 *
 * Must be rendered inside a <Suspense> boundary: useSearchParams opts its subtree
 * into client rendering.
 */
export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    if (!pathname || !posthog) return;
    let url = window.location.origin + pathname;
    const query = searchParams?.toString();
    if (query) url += `?${query}`;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, posthog]);

  return null;
}
