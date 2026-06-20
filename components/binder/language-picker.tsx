"use client";

import { GbButton } from "@/components/gb/gb-button";
import { useDict } from "@/components/i18n/language-provider";
import { LANGUAGES, LANGUAGE_CODES, languageLabel } from "@/lib/tcg/languages";
import { play } from "@/lib/sound";

type LanguagePickerProps = {
  /** Selected language codes (always includes "en"). */
  value: string[];
  onChange: (langs: string[]) => void;
};

/**
 * Toggle which languages a binder mixes in. English is always on (it's the only
 * source with prices); the rest come from TCGdex. Changing the set re-fetches,
 * so the caller navigates rather than just patching local state.
 */
export function LanguagePicker({ value, onChange }: LanguagePickerProps) {
  const dict = useDict();
  const toggle = (code: string) => {
    if (code === "en") return; // English is always included
    play("move");
    const has = value.includes(code);
    const nextSet = new Set(value);
    if (has) nextSet.delete(code);
    else nextSet.add(code);
    nextSet.add("en");
    onChange(LANGUAGE_CODES.filter((c) => nextSet.has(c)));
  };

  return (
    <div role="group" aria-label="Card languages" className="flex flex-col gap-1.5" data-no-click-sound>
      <span className="font-pixel text-[10px] uppercase">{dict.binder.language}</span>
      <div className="flex flex-wrap gap-1.5">
        {LANGUAGES.map((lang) => {
          const on = lang.code === "en" || value.includes(lang.code);
          return (
            <GbButton
              key={lang.code}
              variant={on ? "a" : "b"}
              size="sm"
              aria-pressed={on}
              aria-label={lang.code === "en" ? `${lang.label} (always included)` : lang.label}
              onClick={() => toggle(lang.code)}
            >
              {languageLabel(lang.code)}
            </GbButton>
          );
        })}
      </div>
      <span className="font-body text-base leading-tight text-gb-ink">
        {dict.binder.languageNote}
      </span>
    </div>
  );
}
