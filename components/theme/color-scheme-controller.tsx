"use client";

import { useEffect } from "react";
import { useColorScheme, resolveScheme } from "@/lib/color-scheme";

/**
 * Keeps html[data-color-scheme] in sync with the OS when the preference is
 * "system". The pre-paint script resolves the scheme once at load; this handles
 * the *live* case — the user flips their OS dark/light toggle while the tab is
 * open. Renders nothing. Only "system" follows the OS; an explicit light/dark
 * preference is left untouched.
 */
export function ColorSchemeController() {
  const { scheme } = useColorScheme();

  useEffect(() => {
    if (scheme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.colorScheme = resolveScheme("system");
    };
    // Re-resolve immediately in case the OS changed between pre-paint and mount.
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, [scheme]);

  return null;
}
