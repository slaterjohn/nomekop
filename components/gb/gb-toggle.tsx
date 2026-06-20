"use client";

import { cn } from "@/lib/utils";
import { play } from "@/lib/sound";

type GbToggleProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
};

/**
 * A switch in Game Boy clothing: label, sliding ink block, ON/OFF readout.
 * Native <button role="switch"> gives Space/Enter handling for free.
 */
export function GbToggle({ label, checked, onChange, className }: GbToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-no-click-sound
      onClick={() => {
        play("move");
        onChange(!checked);
      }}
      className={cn(
        "group inline-flex min-h-11 cursor-pointer items-center gap-2 border-[3px] border-transparent px-1 py-1",
        className,
      )}
    >
      <span className="font-pixel text-xs uppercase">{label}</span>
      <span
        aria-hidden="true"
        className="relative inline-block h-5 w-10 border-[3px] border-gb-ink bg-gb-bg"
      >
        <span
          className={cn(
            "absolute top-0 h-full w-1/2 bg-gb-ink motion-safe:transition-[left] motion-safe:duration-100",
            checked ? "left-1/2" : "left-0",
          )}
        />
      </span>
      <span aria-hidden="true" className="w-7 font-pixel text-[10px]">
        {checked ? "ON" : "OFF"}
      </span>
    </button>
  );
}
