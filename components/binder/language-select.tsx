"use client";

import { GbButton } from "@/components/gb/gb-button";
import { LANGUAGES, languageLabel } from "@/lib/tcg/languages";
import { play } from "@/lib/sound";

type LanguageSelectProps = {
  /** The single active language code. */
  value: string;
  onChange: (lang: string) => void;
  /** Group label (also the accessible name). */
  label?: string;
  /** Footnote under the buttons; omit to hide. */
  note?: string;
};

/**
 * Pick ONE language — the whole view is shown in it (Pokédex, localized set
 * lists). English is pokemontcg.io (with prices); every other language is
 * TCGdex. Labels read "日本語 (Japanese)" so the script is both legible and
 * nameable.
 */
export function LanguageSelect({
  value,
  onChange,
  label = "Binder language",
  note = "Non-English cards come from TCGdex and have no prices.",
}: LanguageSelectProps) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1.5">
      <span className="font-pixel text-[10px]">LANGUAGE</span>
      <div className="flex flex-wrap gap-1.5">
        {LANGUAGES.map((lang) => {
          const on = lang.code === value;
          return (
            <GbButton
              key={lang.code}
              variant={on ? "a" : "b"}
              size="sm"
              aria-pressed={on}
              onClick={() => {
                if (lang.code === value) return;
                play("confirm");
                onChange(lang.code);
              }}
            >
              {languageLabel(lang.code)}
            </GbButton>
          );
        })}
      </div>
      {note ? (
        <span className="font-body text-base leading-tight text-gb-ink">{note}</span>
      ) : null}
    </div>
  );
}
