"use client";

import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type GbSelectOption = { value: string; label: string };

type GbSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<GbSelectOption>;
  /** Accessible name (and what screen readers announce). */
  label: string;
  className?: string;
};

/**
 * A Game Boy–skinned native <select>. Native is the right call on mobile — it
 * hands off to the OS picker (scrollable, searchable) instead of a wall of
 * buttons — while the closed control keeps the chunky DMG border + pixel frame.
 */
export function GbSelect({ value, onChange, options, label, className }: GbSelectProps) {
  return (
    <div className={cn("relative inline-flex", className)} data-no-click-sound>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 w-full cursor-pointer appearance-none border-[3px] border-gb-ink bg-gb-bg py-1 pr-9 pl-2.5 font-body text-lg leading-tight text-gb-ink shadow-[2px_2px_0_0_var(--gb-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gb-ink"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-gb-ink"
      />
    </div>
  );
}
