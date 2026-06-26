"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { pushTrail, type Crumb } from "@/lib/nav-trail";

/** Records the current page in the trail without rendering anything — for hub /
 *  landing pages that don't show a breadcrumb but should still appear in the
 *  path of pages reached through them. */
export function TrailRecorder({ label }: { label: string }) {
  const pathname = usePathname();
  useEffect(() => {
    pushTrail(pathname, label);
  }, [pathname, label]);
  return null;
}

/**
 * Contextual breadcrumb. It records the current page in the per-tab trail and
 * renders the actual path the user took to get here (e.g. All Pokémon › Pikachu
 * › Weedle). On a direct landing (no in-app trail) it falls back to the page's
 * logical ancestry, passed as `parents`. The server renders that default too, so
 * the markup is correct before hydration and without JS.
 *
 * The page passes its own accurate `label` (from server data), so prior crumbs
 * always read back with the right names — no title parsing.
 */
export function Breadcrumbs({ parents, label }: { parents: Crumb[]; label: string }) {
  const pathname = usePathname();
  const fallback: Crumb[] = [...parents, { url: pathname, label }];
  const [crumbs, setCrumbs] = useState<Crumb[]>(fallback);

  useEffect(() => {
    const trail = pushTrail(pathname, label);
    const prior = trail.slice(0, -1); // everything visited before this page
    const next = prior.length > 0 ? [...prior, { url: pathname, label }] : [...parents, { url: pathname, label }];
    // Upgrade the SSR fallback to the client-only nav trail after mount. (Reading
    // it in a useState initializer would mismatch the server HTML on hydration.)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCrumbs(next);
  }, [pathname, label, parents]);

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 font-pixel text-sm uppercase leading-relaxed"
    >
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <Fragment key={`${c.url}-${i}`}>
            {i > 0 ? (
              <span aria-hidden="true" className="text-gb-ink/50">
                ›
              </span>
            ) : null}
            {isLast ? (
              <span aria-current="page" className="text-gb-ink/70">
                {c.label}
              </span>
            ) : (
              <Link href={c.url} className="no-underline">
                {c.label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
