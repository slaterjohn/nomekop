"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GbScreen } from "@/components/gb/gb-screen";
import { GbButton } from "@/components/gb/gb-button";
import { GbMenu } from "@/components/gb/gb-menu";
import { GbStepper } from "@/components/gb/gb-stepper";
import { BinderPreview } from "@/components/builder/binder-preview";
import { BinderShelf } from "@/components/builder/binder-shelf";
import { PdfButtons } from "@/components/pdf-buttons";
import { LanguagePicker } from "@/components/binder/language-picker";
import { cardLanguagesEnabled } from "@/lib/features";
import { useDict } from "@/components/i18n/language-provider";
import { format } from "@/lib/i18n/format";
import { POCKET_PRESETS } from "@/lib/config";
import {
  buildIllustratorLayout,
  encodeIllustratorToken,
  type IllustratorBinderOptions,
} from "@/lib/illustrator-binder";
import { play } from "@/lib/sound";
import { capture } from "@/lib/analytics/events";
import type { CardWithSet, TcgSet } from "@/lib/tcg/types";

type IllustratorBinderViewProps = {
  slug: string;
  displayName: string;
  cards: CardWithSet[];
  initialOptions: IllustratorBinderOptions;
};

/** One illustrator, every card they drew, in a binder. Options live in the token URL. */
export function IllustratorBinderView({
  slug,
  displayName,
  cards,
  initialOptions,
}: IllustratorBinderViewProps) {
  const [options, setOptions] = useState(initialOptions);
  const [customOpen, setCustomOpen] = useState(
    !POCKET_PRESETS.some((p) => p.rows === initialOptions.rows && p.cols === initialOptions.cols),
  );
  const router = useRouter();
  const dict = useDict();

  const layout = useMemo(() => buildIllustratorLayout(cards, options), [cards, options]);

  const update = (patch: Partial<IllustratorBinderOptions>) => {
    const next = { ...options, ...patch };
    setOptions(next);
    window.history.replaceState(null, "", `/illustrator/${encodeIllustratorToken(slug, next)}`);
  };

  const logConfig = (field: string, value: string | number | boolean) =>
    capture("binder_config_changed", { field, value, context: "illustrator", slug });

  // Languages change which cards are fetched, so navigate (server re-renders).
  const changeLanguages = (langs: string[]) => {
    logConfig("languages", langs.join(",") || "en");
    router.push(`/illustrator/${encodeIllustratorToken(slug, { ...options, langs })}`);
  };

  const pseudoSet: TcgSet = {
    id: `illustrator-${slug}`,
    name: `${displayName} — illustrations`,
    series: "Illustrator binder",
    printedTotal: 0,
    total: cards.length,
    releaseDate: "",
    symbolUrl: "",
    logoUrl: "",
  };

  const matchingPreset = POCKET_PRESETS.find((p) => p.rows === options.rows && p.cols === options.cols);

  return (
    <div className="flex flex-col gap-6">
      <GbScreen title={dict.binder.options}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Binder size" data-no-click-sound>
            {POCKET_PRESETS.map((preset) => {
              const active = !customOpen && matchingPreset?.label === preset.label;
              return (
                <GbButton
                  key={preset.label}
                  variant={active ? "a" : "b"}
                  size="sm"
                  aria-pressed={active}
                  onClick={() => {
                    play("confirm");
                    setCustomOpen(false);
                    logConfig("grid", `${preset.rows}x${preset.cols}`);
                    update({ rows: preset.rows, cols: preset.cols });
                  }}
                >
                  {preset.label}
                </GbButton>
              );
            })}
            <GbButton
              variant={customOpen || !matchingPreset ? "a" : "b"}
              size="sm"
              aria-pressed={customOpen || !matchingPreset}
              onClick={() => {
                play("confirm");
                setCustomOpen(true);
                logConfig("grid", "custom");
              }}
            >
              {dict.binder.custom}
            </GbButton>
          </div>

          {customOpen || !matchingPreset ? (
            <div className="flex flex-wrap items-center gap-4">
              <GbStepper label={dict.binder.rows} value={options.rows} min={1} max={5} onChange={(rows) => { logConfig("grid", `${rows}x${options.cols}`); update({ rows }); }} />
              <GbStepper label={dict.binder.cols} value={options.cols} min={1} max={5} onChange={(cols) => { logConfig("grid", `${options.rows}x${cols}`); update({ cols }); }} />
            </div>
          ) : null}

          <div className="flex flex-wrap items-start gap-4">
            <GbMenu
              label={dict.binder.order}
              value={options.order}
              onChange={(order) => { logConfig("order", order); update({ order }); }}
              options={[
                { value: "new", label: dict.binder.newestFirst, hint: dict.binder.newestHint },
                { value: "old", label: dict.binder.oldestFirst, hint: dict.binder.oldestHint },
              ]}
              className="min-w-64"
            />
          </div>

          {cardLanguagesEnabled() ? (
            <LanguagePicker value={options.langs} onChange={changeLanguages} />
          ) : null}

          <p aria-live="polite" className="font-pixel text-[10px] uppercase leading-relaxed sm:text-xs">
            {format(dict.binder.pocketsToPages, { slots: layout.stats.slots, pages: layout.stats.pages })}
          </p>
        </div>
      </GbScreen>

      <GbScreen title={dict.binder.preview}>
        <BinderPreview
          set={pseudoSet}
          layout={layout}
          onInspect={(card) => {
            // English (pokemontcg.io) card detail only; TCGdex cards aren't
            // click-through yet.
            if ((card.lang ?? "en") !== "en") return;
            play("confirm");
            router.push(`/card/${card.id}`);
          }}
        />
      </GbScreen>

      <GbScreen title={dict.binder.printDownload}>
        <PdfButtons
          buttons={[
            { label: dict.binder.binderPdf, type: "illustrator", token: encodeIllustratorToken(slug, options) },
            {
              label: dict.binder.placeholdersPdf,
              type: "illustrator-placeholders",
              token: encodeIllustratorToken(slug, options),
            },
          ]}
          printHref={`/print/illustrator?t=${encodeURIComponent(encodeIllustratorToken(slug, options))}`}
          filenameBase={`nomekop-${slug}`}
          context="illustrator"
        />
      </GbScreen>

      <GbScreen title={dict.binder.getBinder}>
        <BinderShelf pockets={options.rows * options.cols} pages={layout.stats.pages} />
      </GbScreen>
    </div>
  );
}
