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
import { GbToggle } from "@/components/gb/gb-toggle";
import { GbSelect } from "@/components/gb/gb-select";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { CookieToggle } from "@/components/analytics/cookie-toggle";
import { useDict, useLocale, useSetLocale } from "@/components/i18n/language-provider";
import { LANGUAGES, languageLabel } from "@/lib/tcg/languages";
import { useSoundEnabled, play } from "@/lib/sound";
import { useReducedMotion } from "@/lib/motion";
import { useFont, type FontType } from "@/lib/font";
import { useFontSize, type FontSize } from "@/lib/font-size";
import { useColorScheme, type ColorSchemePref } from "@/lib/color-scheme";
import { analyticsEnabled } from "@/lib/analytics/posthog";
import { capture } from "@/lib/analytics/events";

/**
 * The app's personalisation knobs in one header-launched dialog: UI language,
 * colour palette, font type (pixel / mono / sans), text size, appearance
 * (system / light / dark), sound cues, and a master "reduce animation" switch.
 * The dialog is a fixed-height column — a non-scrolling title bar (with an
 * always-visible close) over a scrollable body, so it never overflows a small
 * screen.
 */
export function SettingsPanel() {
  const dict = useDict();
  const locale = useLocale();
  const setLocale = useSetLocale();
  const { enabled: soundOn, setEnabled: setSound } = useSoundEnabled();
  const { reduced, setReduced } = useReducedMotion();
  const { font, setFont } = useFont();
  const { size, setSize } = useFontSize();
  const { scheme, setScheme } = useColorScheme();

  const languageOptions = LANGUAGES.map((language) => ({
    value: language.code,
    label: languageLabel(language.code),
  }));

  const fontOptions: Array<{ value: FontType; label: string }> = [
    { value: "pixel", label: dict.settings.fontPixel },
    { value: "mono", label: dict.settings.fontMono },
    { value: "sans", label: dict.settings.fontSans },
  ];

  const textSizeOptions: Array<{ value: FontSize; label: string }> = [
    { value: "0", label: dict.settings.textSizeDefault },
    { value: "1", label: dict.settings.textSizeLarge },
    { value: "2", label: dict.settings.textSizeLarger },
    { value: "3", label: dict.settings.textSizeLargest },
  ];

  const appearanceOptions: Array<{ value: ColorSchemePref; label: string }> = [
    { value: "system", label: dict.settings.appearanceSystem },
    { value: "light", label: dict.settings.appearanceLight },
    { value: "dark", label: dict.settings.appearanceDark },
  ];

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
        className="flex max-h-[85dvh] w-full max-w-md flex-col gap-0 rounded-none border-[3px] border-gb-ink bg-gb-bg p-0 text-gb-ink shadow-[4px_4px_0_0_var(--gb-ink)] ring-0"
      >
        {/* Title bar: never scrolls, so the close button is always reachable. */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b-[3px] border-gb-ink bg-gb-ink px-4 py-3">
          <DialogTitle className="font-pixel text-base uppercase text-gb-bg">
            {dict.settings.title}
          </DialogTitle>
          <DialogClose
            aria-label={dict.settings.close}
            className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center border-[3px] border-gb-bg bg-gb-ink text-gb-bg motion-safe:transition-transform motion-safe:hover:-translate-y-0.5"
          >
            <XIcon aria-hidden="true" className="size-4" />
          </DialogClose>
        </div>

        {/* Scrollable body. */}
        <div className="flex flex-col gap-5 overflow-y-auto p-4">
          <DialogDescription className="font-body text-lg leading-tight text-gb-ink">
            {dict.settings.description}
          </DialogDescription>

          <section className="flex flex-col gap-2">
            <h3 className="font-pixel text-[10px] uppercase text-gb-ink">
              {dict.settings.language}
            </h3>
            <GbSelect
              label={dict.settings.language}
              value={locale}
              onChange={(code) => {
                if (code === locale) return;
                play("confirm");
                capture("setting_changed", { setting: "language", value: code });
                setLocale(code);
              }}
              options={languageOptions}
              className="w-full max-w-xs"
            />
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="font-pixel text-[10px] uppercase text-gb-ink">
              {dict.settings.palette}
            </h3>
            <div className="flex flex-wrap">
              <ThemeSwitcher />
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="font-pixel text-[10px] uppercase text-gb-ink">
              {dict.settings.font}
            </h3>
            <GbSelect
              label={dict.settings.font}
              value={font}
              onChange={(value) => {
                const next = fontOptions.find((option) => option.value === value)?.value;
                if (!next || next === font) return;
                play("confirm");
                capture("setting_changed", { setting: "font", value: next });
                setFont(next);
              }}
              options={fontOptions}
              className="w-full max-w-xs"
            />
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="font-pixel text-[10px] uppercase text-gb-ink">
              {dict.settings.textSize}
            </h3>
            <GbSelect
              label={dict.settings.textSize}
              value={size}
              onChange={(value) => {
                const next = textSizeOptions.find((option) => option.value === value)?.value;
                if (!next || next === size) return;
                play("confirm");
                capture("setting_changed", { setting: "text_size", value: next });
                setSize(next);
              }}
              options={textSizeOptions}
              className="w-full max-w-xs"
            />
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="font-pixel text-[10px] uppercase text-gb-ink">
              {dict.settings.appearance}
            </h3>
            <GbSelect
              label={dict.settings.appearance}
              value={scheme}
              onChange={(value) => {
                const next = appearanceOptions.find((option) => option.value === value)?.value;
                if (!next || next === scheme) return;
                play("confirm");
                capture("setting_changed", { setting: "appearance", value: next });
                setScheme(next);
              }}
              options={appearanceOptions}
              className="w-full max-w-xs"
            />
          </section>

          <section className="flex flex-col gap-1">
            <h3 className="font-pixel text-[10px] uppercase text-gb-ink">
              {dict.settings.soundMotion}
            </h3>
            <GbToggle
              label={dict.settings.sound}
              checked={soundOn}
              onChange={(on) => {
                capture("setting_changed", { setting: "sound", value: on });
                setSound(on);
                if (on) play("success");
              }}
            />
            <GbToggle
              label={dict.settings.reduceAnimation}
              checked={reduced}
              onChange={(value) => {
                capture("setting_changed", { setting: "reduce_motion", value });
                setReduced(value);
              }}
            />
          </section>

          {analyticsEnabled() && (
            <section className="flex flex-col gap-1">
              <h3 className="font-pixel text-[10px] uppercase text-gb-ink">
                {dict.settings.privacy}
              </h3>
              <CookieToggle />
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
