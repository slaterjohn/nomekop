"use client";

import Image from "next/image";
import { useMemo } from "react";
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
import type { TcgSet } from "@/lib/tcg/types";

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
  const bySeries = useMemo(() => {
    const groups = new Map<string, TcgSet[]>();
    for (const set of sets ?? []) {
      const list = groups.get(set.series) ?? [];
      list.push(set);
      groups.set(set.series, list);
    }
    return [...groups.entries()];
  }, [sets]);

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
      <CommandInput
        placeholder="SEARCH SETS…"
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
                <span className="flex-1 truncate">{set.name}</span>
                <span className="shrink-0 font-pixel text-[10px]">
                  {set.printedTotal}/{set.total}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  );
}
