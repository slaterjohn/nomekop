"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { THEMES } from "@/lib/themes";
import { useTheme } from "@/components/theme/theme-provider";
import { play } from "@/lib/sound";
import { capture } from "@/lib/analytics/events";

/**
 * Palette picker: one swatch per Game Boy palette, radiogroup semantics with
 * arrow-key roving focus — like flicking palettes on a Game Boy Color boot.
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const selectedIndex = Math.max(0, THEMES.findIndex((t) => t.id === theme));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  const focusIndex = (i: number, buttons: HTMLButtonElement[]) => {
    const next = (i + THEMES.length) % THEMES.length;
    setActiveIndex(next);
    buttons[next]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const group = e.currentTarget.closest("[role=radiogroup]");
    if (!group) return;
    const buttons = Array.from(group.querySelectorAll<HTMLButtonElement>("button[role=radio]"));
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        play("move");
        focusIndex(activeIndex + 1, buttons);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        play("move");
        focusIndex(activeIndex - 1, buttons);
        break;
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Colour palette"
      className="flex items-center gap-1.5"
      data-no-click-sound
    >
      {THEMES.map((t, i) => {
        const selected = t.id === theme;
        const [ink, , accent, bg] = t.shades;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${t.label} palette`}
            tabIndex={i === activeIndex ? 0 : -1}
            onKeyDown={onKeyDown}
            onFocus={() => setActiveIndex(i)}
            onClick={() => {
              capture("setting_changed", { setting: "palette", value: t.id });
              setTheme(t.id);
              play("confirm");
            }}
            className={cn(
              "size-7 cursor-pointer border-[3px] p-px transition-transform motion-safe:hover:-translate-y-0.5",
              selected ? "border-gb-ink shadow-[2px_2px_0_0_var(--gb-ink)]" : "border-gb-muted",
            )}
            style={{ background: bg }}
            title={t.label}
          >
            <span aria-hidden="true" className="flex h-full">
              <span className="h-full w-1/2" style={{ background: ink }} />
              <span className="h-full w-1/2" style={{ background: accent }} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
