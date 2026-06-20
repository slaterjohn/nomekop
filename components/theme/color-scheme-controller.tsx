"use client";

import { useEffect } from "react";
import { useColorScheme, resolveScheme } from "@/lib/color-scheme";

/**
 * Keeps html[data-color-scheme] in sync with the current preference. The
 * pre-paint script resolves the scheme once at load; this corrects it on every
 * render with the real pref and handles the *live* case — the user flips their
 * OS dark/light toggle while the tab is open. Renders nothing.
 *
 * The attribute is ALWAYS synced to the resolved pref: during hydration
 * useColorScheme() first yields the server snapshot ("system"), then re-renders
 * with the stored pref. Re-syncing every time means an explicit light/dark
 * choice isn't left on the OS-resolved value from that first render. The OS
 * listener is only attached for "system".
 */
export function ColorSchemeController() {
  const { scheme } = useColorScheme();

  useEffect(() => {
    document.documentElement.dataset.colorScheme = resolveScheme(scheme);
    if (scheme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.colorScheme = resolveScheme("system");
    };
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, [scheme]);

  return null;
}
