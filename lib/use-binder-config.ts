"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseConfig, serializeConfig, type BinderConfig } from "@/lib/config";

/**
 * Binder config lives in the URL: shareable, bookmarkable, survives reload.
 * Updates use router.replace (no history spam, no scroll jump).
 */
export function useBinderConfig(): {
  config: BinderConfig;
  update: (patch: Partial<BinderConfig>) => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const config = useMemo(
    () => parseConfig(Object.fromEntries(searchParams.entries())),
    [searchParams],
  );

  const update = useCallback(
    (patch: Partial<BinderConfig>) => {
      const next = serializeConfig({ ...config, ...patch });
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [config, pathname, router],
  );

  return { config, update };
}
