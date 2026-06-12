"use client";

import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { GbToggle } from "@/components/gb/gb-toggle";
import { useSoundEnabled, play } from "@/lib/sound";

const WORDMARK = "BINDERMON";

/** Title bar: staggered pixel wordmark, palette switcher, sound toggle. */
export function Header() {
  const { enabled, setEnabled } = useSoundEnabled();

  return (
    <header className="border-b-4 border-gb-ink bg-gb-bg">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <h1 className="font-pixel text-lg leading-none sm:text-2xl" aria-label={WORDMARK}>
            {WORDMARK.split("").map((letter, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="inline-block motion-safe:animate-gb-deal"
                style={{ animationDelay: `${i * 55}ms` }}
              >
                {letter}
              </span>
            ))}
          </h1>
          <p className="mt-1 font-body text-lg leading-none">
            Pokemon TCG binder layouts, checklists &amp; printables
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ThemeSwitcher />
          <GbToggle
            label="SOUND"
            checked={enabled}
            onChange={(on) => {
              setEnabled(on);
              // Audible proof the toggle worked — a full jingle, not a blip.
              if (on) play("success");
            }}
          />
        </div>
      </div>
    </header>
  );
}
