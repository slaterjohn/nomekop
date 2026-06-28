"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { capture } from "@/lib/analytics/events";

export type SortOption = { value: string; label: string };

/** A row of sort links (?sort=…) for a directory page. Each click emits a
 *  directory_sorted event, then navigates — the link still drives the sort, so
 *  it degrades to plain navigation without JS. */
export function SortTabs({
  basePath,
  current,
  options,
}: {
  basePath: string;
  current: string;
  options: SortOption[];
}) {
  const directory = basePath.replace(/^\//, "");
  return (
    <div className="flex flex-wrap items-center gap-2 font-pixel text-[10px] uppercase">
      <span className="text-gb-ink/70">Sort</span>
      {options.map((o) => {
        const active = o.value === current;
        return (
          <Link
            key={o.value}
            href={`${basePath}?sort=${o.value}`}
            aria-current={active ? "true" : undefined}
            onClick={() => capture("directory_sorted", { directory, sort: o.value })}
            className={cn(
              "border-2 border-gb-ink px-2 py-1 no-underline",
              active ? "bg-gb-accent text-gb-ink" : "bg-gb-bg text-gb-ink",
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
