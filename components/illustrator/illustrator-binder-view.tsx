"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GbScreen } from "@/components/gb/gb-screen";
import { GbButton } from "@/components/gb/gb-button";
import { GbMenu } from "@/components/gb/gb-menu";
import { GbStepper } from "@/components/gb/gb-stepper";
import { BinderPreview } from "@/components/builder/binder-preview";
import { PdfButtons } from "@/components/pdf-buttons";
import { LanguagePicker } from "@/components/binder/language-picker";
import { POCKET_PRESETS } from "@/lib/config";
import {
  buildIllustratorLayout,
  encodeIllustratorToken,
  type IllustratorBinderOptions,
} from "@/lib/illustrator-binder";
import { play } from "@/lib/sound";
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

  const layout = useMemo(() => buildIllustratorLayout(cards, options), [cards, options]);

  const update = (patch: Partial<IllustratorBinderOptions>) => {
    const next = { ...options, ...patch };
    setOptions(next);
    window.history.replaceState(null, "", `/illustrator/${encodeIllustratorToken(slug, next)}`);
  };

  // Languages change which cards are fetched, so navigate (server re-renders).
  const changeLanguages = (langs: string[]) => {
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
      <GbScreen title="BINDER OPTIONS">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Binder size">
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
              }}
            >
              CUSTOM
            </GbButton>
          </div>

          {customOpen || !matchingPreset ? (
            <div className="flex flex-wrap items-center gap-4">
              <GbStepper label="ROWS" value={options.rows} min={1} max={5} onChange={(rows) => update({ rows })} />
              <GbStepper label="COLS" value={options.cols} min={1} max={5} onChange={(cols) => update({ cols })} />
            </div>
          ) : null}

          <div className="flex flex-wrap items-start gap-4">
            <GbMenu
              label="Binder order"
              value={options.order}
              onChange={(order) => update({ order })}
              options={[
                { value: "new", label: "NEWEST FIRST", hint: "latest sets up front" },
                { value: "old", label: "OLDEST FIRST", hint: "vintage leads" },
              ]}
              className="min-w-64"
            />
          </div>

          <LanguagePicker value={options.langs} onChange={changeLanguages} />

          <p aria-live="polite" className="font-pixel text-[10px] leading-relaxed sm:text-xs">
            {layout.stats.slots} POCKETS → {layout.stats.pages} PAGES
          </p>
        </div>
      </GbScreen>

      <GbScreen title="PREVIEW">
        <BinderPreview
          set={pseudoSet}
          layout={layout}
          onInspect={(card) => {
            play("confirm");
            router.push(`/card/${card.id}`);
          }}
        />
      </GbScreen>

      <GbScreen title="PRINT & DOWNLOAD">
        <PdfButtons
          buttons={[
            { label: "BINDER PDF", type: "illustrator", token: encodeIllustratorToken(slug, options) },
            {
              label: "PLACEHOLDERS PDF",
              type: "illustrator-placeholders",
              token: encodeIllustratorToken(slug, options),
            },
          ]}
          printHref={`/print/illustrator?t=${encodeURIComponent(encodeIllustratorToken(slug, options))}`}
          filenameBase={`nomekop-${slug}`}
        />
      </GbScreen>
    </div>
  );
}
