"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { rememberScroll, recallScroll } from "@/lib/scroll-memory";

/**
 * Restores window scroll on Back/Forward (in-app ◀ BACK or the browser button),
 * keyed by URL. Next's built-in restoration snaps these pages to the top because
 * they're force-dynamic and stream their content via Suspense — so when the
 * history pops, the page is briefly a short skeleton and any restore clamps to
 * 0. We take over scroll handling: continuously remember each page's offset, and
 * on a pop re-apply the saved offset across animation frames until the streamed
 * content has grown tall enough to reach it.
 *
 * Forward navigations (link clicks) still go to the top, as expected.
 */
export function ScrollRestorer() {
  const pathname = usePathname();
  const poppedRef = useRef(false);
  const currentRef = useRef(pathname);
  const firstRef = useRef(true);

  useEffect(() => {
    // Take control from the browser's heuristic restoration.
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    const onPop = () => {
      poppedRef.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Continuously remember the current page's scroll (debounced).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        rememberScroll(currentRef.current, window.scrollY);
      }, 150);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // On navigation: restore (Back/Forward/reload) or reset to top (link click).
  useEffect(() => {
    // The continuous scroll handler already saved the page we're leaving (by the
    // time this runs, the route has swapped and scroll is 0 — reading it here
    // would clobber the saved offset). Just point the handler at the new page.
    currentRef.current = pathname;

    let popped = poppedRef.current;
    poppedRef.current = false;
    if (firstRef.current) {
      firstRef.current = false;
      // A full reload or a cross-document Back/Forward should also restore.
      const navType = (
        performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined
      )?.type;
      if (navType === "back_forward" || navType === "reload") popped = true;
    }

    const target = popped ? (recallScroll(pathname) ?? 0) : 0;
    if (target <= 0) {
      window.scrollTo(0, 0);
      return;
    }

    // Re-apply on a timer: a force-dynamic page refetches its content on Back and
    // streamed content grows after the route swaps in, so a single scrollTo clamps
    // short while the page is still loading. Keep re-applying until we actually
    // reach the offset, capped generously for a slow refetch. A timer (not
    // requestAnimationFrame, which browsers pause on backgrounded tabs) drives it
    // so it still fires if the tab isn't focused. Bail the moment the user scrolls
    // themselves, so we never fight them.
    let timer: ReturnType<typeof setTimeout> | undefined;
    let aborted = false;
    const start = Date.now();
    const onUserScroll = () => {
      aborted = true;
    };
    window.addEventListener("wheel", onUserScroll, { passive: true });
    window.addEventListener("touchstart", onUserScroll, { passive: true });
    window.addEventListener("keydown", onUserScroll);
    const stop = () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("wheel", onUserScroll);
      window.removeEventListener("touchstart", onUserScroll);
      window.removeEventListener("keydown", onUserScroll);
    };
    const tick = () => {
      if (aborted) return stop();
      window.scrollTo(0, target);
      if (window.scrollY >= target - 2 || Date.now() - start >= 5000) return stop();
      timer = setTimeout(tick, 50);
    };
    tick();
    return stop;
  }, [pathname]);

  return null;
}
