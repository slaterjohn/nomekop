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
    // Save the page we're leaving before switching the active key.
    if (currentRef.current !== pathname) rememberScroll(currentRef.current, window.scrollY);
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

    // Re-apply across frames: streamed content grows after the route swaps in,
    // so a single scrollTo would clamp short. Stop once we reach it or ~1.5s in.
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      window.scrollTo(0, target);
      if (window.scrollY < target - 2 && performance.now() - start < 1500) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return null;
}
