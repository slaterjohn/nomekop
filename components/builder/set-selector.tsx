"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { GbDialogBox } from "@/components/gb/gb-dialog-box";
import { GbButton } from "@/components/gb/gb-button";
import { GbSpinner } from "@/components/gb/gb-spinner";
import { play } from "@/lib/sound";
import type { TcgSet } from "@/lib/tcg/types";

type SortMode = "newest" | "oldest" | "az";

const SORT_OPTIONS: Array<{ mode: SortMode; label: string; ariaLabel: string }> = [
  { mode: "newest", label: "NEWEST", ariaLabel: "Sort newest first" },
  { mode: "oldest", label: "OLDEST", ariaLabel: "Sort oldest first" },
  { mode: "az", label: "A–Z", ariaLabel: "Sort alphabetically" },
];

/** Groups sets by series, ordered per the sort mode (groups follow their sets). */
function groupSets(sets: ReadonlyArray<TcgSet>, sort: SortMode): Array<[string, TcgSet[]]> {
  const sorted = [...sets].sort((a, b) => {
    if (sort === "az") return a.name.localeCompare(b.name);
    const byDate = a.releaseDate.localeCompare(b.releaseDate);
    return sort === "newest" ? -byDate : byDate;
  });
  const groups = new Map<string, TcgSet[]>();
  for (const set of sorted) {
    const list = groups.get(set.series) ?? [];
    list.push(set);
    groups.set(set.series, list);
  }
  const entries = [...groups.entries()];
  if (sort === "az") entries.sort((a, b) => a[0].localeCompare(b[0]));
  return entries;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "1999/01/09" → "9 Jan 1999"; returns the raw string if it can't parse. */
function formatReleaseDate(date: string): string {
  const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(date);
  if (!m) return date;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

type SetSelectorProps = {
  sets: TcgSet[] | undefined;
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  onSelect: (set: TcgSet) => void;
};

/**
 * Searchable, series-grouped set picker — a Command palette wearing the GB
 * menu skin. cmdk provides combobox/listbox semantics and typeahead.
 */
export function SetSelector({ sets, isLoading, error, onRetry, onSelect }: SetSelectorProps) {
  const [sort, setSort] = useState<SortMode>("newest");
  const bySeries = useMemo(() => groupSets(sets ?? [], sort), [sets, sort]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <GbSpinner label="LOADING SETS…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <GbDialogBox tone="error">{error}</GbDialogBox>
        {onRetry ? (
          <GbButton variant="a" onClick={onRetry}>
            RETRY
          </GbButton>
        ) : null}
      </div>
    );
  }

  return (
    <Command label="Search sets" className="border-[3px] border-gb-ink bg-gb-bg p-0">
      <div className="flex flex-wrap items-center gap-2 border-b-[3px] border-gb-ink p-2" data-no-click-sound>
        <span className="font-pixel text-[10px]">SORT</span>
        {SORT_OPTIONS.map(({ mode, label, ariaLabel }) => (
          <GbButton
            key={mode}
            variant={sort === mode ? "a" : "b"}
            size="sm"
            aria-pressed={sort === mode}
            aria-label={ariaLabel}
            onClick={() => {
              play("move");
              setSort(mode);
            }}
          >
            {label}
          </GbButton>
        ))}
      </div>
      <CommandInput
        placeholder="SEARCH SETS…"
        aria-label="Search sets"
        className="font-body text-xl placeholder:text-gb-ink/60"
      />
      <CommandList className="max-h-80">
        <CommandEmpty>
          <span className="font-pixel text-xs leading-relaxed">
            WILD MISSINGNO. APPEARED!
            <br />
            <span className="font-body text-lg">No sets match that search.</span>
          </span>
        </CommandEmpty>
        {bySeries.map(([series, seriesSets]) => (
          <CommandGroup
            key={series}
            heading={series}
            className="**:[[cmdk-group-heading]]:font-pixel **:[[cmdk-group-heading]]:text-[10px] **:[[cmdk-group-heading]]:uppercase"
          >
            {seriesSets.map((set) => (
              <CommandItem
                key={set.id}
                value={`${set.name} ${set.series} ${set.id}`}
                onSelect={() => onSelect(set)}
                className="gap-2 font-body text-xl data-[selected=true]:bg-gb-accent data-[selected=true]:text-gb-ink"
              >
                <span aria-hidden="true" className="w-3 shrink-0 font-pixel text-[10px]">
                  ▶
                </span>
                {set.symbolUrl ? (
                  <Image
                    src={set.symbolUrl}
                    alt=""
                    width={20}
                    height={20}
                    className="size-5 shrink-0 object-contain"
                    unoptimized
                  />
                ) : (
                  <span aria-hidden="true" className="inline-block size-5 shrink-0" />
                )}
                <span className="min-w-0 flex-1 leading-none">
                  <span className="block truncate">{set.name}</span>
                  <span className="mt-0.5 block font-body text-base">
                    {formatReleaseDate(set.releaseDate)}
                  </span>
                </span>
                <span className="shrink-0 font-pixel text-[10px]">
                  {Math.max(set.printedTotal, set.total)} cards
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  );
}
