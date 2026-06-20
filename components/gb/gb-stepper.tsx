"use client";

import { cn } from "@/lib/utils";
import { GbButton } from "@/components/gb/gb-button";
import { play } from "@/lib/sound";

type GbStepperProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  className?: string;
};

/**
 * Accessible numeric stepper: − / + buttons flank a focusable spinbutton that
 * also responds to ArrowUp/Down/Home/End. Values clamp to [min, max].
 */
export function GbStepper({ label, value, min, max, onChange, className }: GbStepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const set = (n: number) => {
    const next = clamp(n);
    if (next !== value) {
      play("move");
      onChange(next);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const handlers: Record<string, number> = {
      ArrowUp: value + 1,
      ArrowRight: value + 1,
      ArrowDown: value - 1,
      ArrowLeft: value - 1,
      Home: min,
      End: max,
    };
    const next = handlers[e.key];
    if (next !== undefined) {
      e.preventDefault();
      set(next);
    }
  };

  return (
    <div className={cn("inline-flex items-center gap-2", className)} data-no-click-sound>
      <span className="font-pixel text-xs uppercase" id={`gb-stepper-${label}`}>
        {label}
      </span>
      <GbButton variant="b" size="sm" aria-label={`Decrease ${label}`} onClick={() => set(value - 1)}>
        −
      </GbButton>
      <span
        role="spinbutton"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onKeyDown={onKeyDown}
        className="min-w-9 border-[3px] border-gb-ink bg-gb-bg px-2 py-1 text-center font-pixel text-sm"
      >
        {value}
      </span>
      <GbButton variant="b" size="sm" aria-label={`Increase ${label}`} onClick={() => set(value + 1)}>
        +
      </GbButton>
    </div>
  );
}
