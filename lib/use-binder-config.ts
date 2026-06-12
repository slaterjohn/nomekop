"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { parseConfig, type BinderConfig } from "@/lib/config";
import { decodeShareToken, encodeShareToken } from "@/lib/share";

/**
 * Binder config lives in the address bar as a share token — /b/sv1~34m111ic —
 * so the URL is always copy-ready and query-free. Legacy ?set=… URLs still
 * parse (and convert to token form on the first change).
 *
 * Updates go through history.replaceState (which Next syncs into
 * usePathname/useSearchParams): a router.replace to a new token value would
 * remount the page on every tweak, resetting UI state mid-interaction.
 */
export function useBinderConfig(): {
  config: BinderConfig;
  update: (patch: Partial<BinderConfig>) => void;
} {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const config = useMemo(() => {
    const tokenMatch = /^\/b\/([^/]+)$/.exec(pathname);
    if (tokenMatch) {
      const decoded = decodeShareToken(decodeURIComponent(tokenMatch[1]!));
      if (decoded) return decoded;
    }
    return parseConfig(Object.fromEntries(searchParams.entries()));
  }, [pathname, searchParams]);

  const update = useCallback(
    (patch: Partial<BinderConfig>) => {
      const next = { ...config, ...patch };
      const target = next.set ? `/b/${encodeShareToken(next)}` : "/";
      window.history.replaceState(null, "", target);
    },
    [config],
  );

  return { config, update };
}
