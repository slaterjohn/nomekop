"use client";

import { SettingsIcon, XIcon } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GbButton } from "@/components/gb/gb-button";
import { GbToggle } from "@/components/gb/gb-toggle";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { useDict, useLocale, useSetLocale } from "@/components/i18n/language-provider";
import { LANGUAGES, languageLabel } from "@/lib/tcg/languages";
import { useSoundEnabled, play } from "@/lib/sound";
import { useReducedMotion } from "@/lib/motion";

/**
 * The app's personalisation knobs in one header-launched dialog: UI language,
 * colour palette, sound cues, and a master "reduce animation" switch. Base UI's
 * Dialog gives us the focus trap, Escape-to-close, and focus restoration for free.
 */
export function SettingsPanel() {
  const dict = useDict();
  const locale = useLocale();
  const setLocale = useSetLocale();
  const { enabled: soundOn, setEnabled: setSound } = useSoundEnabled();
  const { reduced, setReduced } = useReducedMotion();

  return (
    <Dialog>
      <DialogTrigger
        aria-label={dict.settings.open}
        className="inline-flex size-9 cursor-pointer items-center justify-center border-[3px] border-gb-ink bg-gb-bg text-gb-ink motion-safe:transition-transform motion-safe:hover:-translate-y-0.5"
      >
        <SettingsIcon aria-hidden="true" className="size-4" />
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="grid gap-5 rounded-none border-[3px] border-gb-ink bg-gb-bg text-gb-ink shadow-[4px_4px_0_0_var(--gb-ink)] ring-0"
      >
        <DialogClose
          aria-label={dict.settings.close}
          className="absolute top-2 right-2 inline-flex size-7 cursor-pointer items-center justify-center border-[3px] border-gb-ink bg-gb-bg text-gb-ink"
        >
          <XIcon aria-hidden="true" className="size-4" />
        </DialogClose>

        <DialogTitle className="font-pixel text-base uppercase text-gb-ink">
          {dict.settings.title}
        </DialogTitle>
        <DialogDescription className="font-body text-lg leading-tight text-gb-ink">
          {dict.settings.description}
        </DialogDescription>

        <section className="flex flex-col gap-2">
          <h3 className="font-pixel text-[10px] uppercase text-gb-ink">{dict.settings.language}</h3>
          <div role="group" aria-label={dict.settings.language} className="flex flex-wrap gap-1.5">
            {LANGUAGES.map((language) => {
              const on = language.code === locale;
              return (
                <GbButton
                  key={language.code}
                  variant={on ? "a" : "b"}
                  size="sm"
                  aria-pressed={on}
                  onClick={() => {
                    if (language.code === locale) return;
                    play("confirm");
                    setLocale(language.code);
                  }}
                >
                  {languageLabel(language.code)}
                </GbButton>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="font-pixel text-[10px] uppercase text-gb-ink">{dict.settings.palette}</h3>
          <div className="flex flex-wrap">
            <ThemeSwitcher />
          </div>
        </section>

        <section className="flex flex-col gap-1">
          <h3 className="font-pixel text-[10px] uppercase text-gb-ink">{dict.settings.soundMotion}</h3>
          <GbToggle
            label={dict.settings.sound}
            checked={soundOn}
            onChange={(on) => {
              setSound(on);
              if (on) play("success");
            }}
          />
          <GbToggle
            label={dict.settings.reduceAnimation}
            checked={reduced}
            onChange={setReduced}
          />
        </section>
      </DialogContent>
    </Dialog>
  );
}
