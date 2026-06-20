"use client";

import { GbButton } from "@/components/gb/gb-button";
import { useDict } from "@/components/i18n/language-provider";
import { LANGUAGES, languageLabel } from "@/lib/tcg/languages";
import { play } from "@/lib/sound";

type LanguageSelectProps = {
  /** The single active language code. */
  value: string;
  onChange: (lang: string) => void;
  /** Group label (also the accessible name). Defaults to "Binder language". */
  label?: string;
  /** Footnote under the buttons; defaults to the TCGdex/no-prices note, "" hides it. */
  note?: string;
};

/**
 * Pick ONE language — the whole view is shown in it (Pokédex, localized set
 * lists). English is pokemontcg.io (with prices); every other language is
 * TCGdex. Labels read "日本語 (Japanese)" so the script is both legible and
 * nameable.
 */
export function LanguageSelect({ value, onChange, label, note }: LanguageSelectProps) {
  const dict = useDict();
  const groupLabel = label ?? "Binder language";
  const footnote = note ?? dict.binder.languageNote;
  return (
    <div role="group" aria-label={groupLabel} className="flex flex-col gap-1.5" data-no-click-sound>
      <span className="font-pixel text-[10px] uppercase">{dict.binder.language}</span>
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
      {footnote ? (
        <span className="font-body text-base leading-tight text-gb-ink">{footnote}</span>
      ) : null}
    </div>
  );
}
