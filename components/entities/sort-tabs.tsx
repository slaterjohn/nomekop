import Link from "next/link";
import { cn } from "@/lib/utils";

export type SortOption = { value: string; label: string };

/** A row of server-rendered sort links (?sort=…) for a directory page. Plain
 *  navigation — no client JS — so a 1,000-item list stays cheap. */
export function SortTabs({
  basePath,
  current,
  options,
}: {
  basePath: string;
  current: string;
  options: SortOption[];
}) {
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
