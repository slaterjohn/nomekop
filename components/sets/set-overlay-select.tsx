"use client";

import { useRouter } from "next/navigation";
import { GbSelect } from "@/components/gb/gb-select";
import { LANGUAGES, languageLabel } from "@/lib/tcg/languages";
import { play } from "@/lib/sound";
import { capture } from "@/lib/analytics/events";

/** The /sets language-overlay control: a clear select that navigates to
 *  /sets?lang=<code> (English = the plain list). Replaces the old tab row so the
 *  "show Japanese sets" option reads as an option, and works as an OS picker on
 *  mobile. */
export function SetOverlaySelect({ value, label }: { value: string; label: string }) {
  const router = useRouter();
  return (
    <GbSelect
      label={label}
      value={value}
      onChange={(lang) => {
        play("confirm");
        capture("set_overlay_language_changed", { lang });
        router.push(lang === "en" ? "/sets" : `/sets?lang=${lang}`);
      }}
      options={LANGUAGES.map((language) => ({
        value: language.code,
        label: languageLabel(language.code),
      }))}
      className="w-full max-w-xs"
    />
  );
}
