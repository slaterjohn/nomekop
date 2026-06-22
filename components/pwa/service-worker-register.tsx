"use client";

import { useEffect } from "react";

/**
 * Registers the offline service worker (/sw.js). Renders nothing.
 *
 * Only registers on the deployed site: skipped in development and in the e2e /
 * `next start` harness (which runs on 127.0.0.1) so a cache-first worker can't
 * serve stale chunks during HMR or make Playwright runs flaky. The worker itself
 * is network-first for pages, so it never holds back a new deploy.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const { hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Registration is a progressive enhancement; ignore failures.
      });
    };

    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
