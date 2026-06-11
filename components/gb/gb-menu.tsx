"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type GbMenuOption<T extends string> = {
  value: T;
  label: string;
  /** Secondary line, exposed as the option's accessible description. */
  hint?: string;
};

type GbMenuProps<T extends string> = {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<GbMenuOption<T>>;
  className?: string;
};

/**
 * The classic Game Boy menu: a vertical list driven by the d-pad. Implements
 * the WAI-ARIA listbox pattern with a roving tabindex; the blinking ▶ cursor
 * doubles as the focus indicator (plus :focus-visible outline).
 */
export function GbMenu<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: GbMenuProps<T>) {
  const id = useId();
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const refs = useRef<Array<HTMLLIElement | null>>([]);

  const focusIndex = (i: number) => {
    const next = (i + options.length) % options.length;
    setActiveIndex(next);
    refs.current[next]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusIndex(activeIndex + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusIndex(activeIndex - 1);
        break;
      case "Home":
        e.preventDefault();
        focusIndex(0);
        break;
      case "End":
        e.preventDefault();
        focusIndex(options.length - 1);
        break;
      case "Enter":
      case " ": {
        e.preventDefault();
        const opt = options[activeIndex];
        if (opt) onChange(opt.value);
        break;
      }
    }
  };

  return (
    <ul
      role="listbox"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("m-0 list-none border-[3px] border-gb-ink bg-gb-bg p-1", className)}
    >
      {options.map((opt, i) => {
        const active = i === activeIndex;
        const selected = opt.value === value;
        return (
          <li
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="option"
            aria-selected={selected}
            aria-describedby={opt.hint ? `${id}-hint-${i}` : undefined}
            tabIndex={active ? 0 : -1}
            onClick={() => {
              setActiveIndex(i);
              onChange(opt.value);
            }}
            onFocus={() => setActiveIndex(i)}
            className={cn(
              "flex cursor-pointer items-baseline gap-2 px-2 py-2",
              selected && "bg-gb-accent",
            )}
          >
            <span
              aria-hidden="true"
              data-gb-cursor={active ? "visible" : "hidden"}
              className={cn(
                "w-4 shrink-0 font-pixel text-xs",
                active ? "motion-safe:animate-gb-blink" : "invisible",
              )}
            >
              ▶
            </span>
            <span className="flex flex-col">
              <span className="font-pixel text-xs uppercase">{opt.label}</span>
              {opt.hint ? (
                // ink, not muted: 18px regular text is below the WCAG
                // large-text threshold, so the 3:1 muted shade is off-limits.
                <span id={`${id}-hint-${i}`} className="text-lg leading-tight">
                  {opt.hint}
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
