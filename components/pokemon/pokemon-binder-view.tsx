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
  buildPokemonLayout,
  encodePokemonToken,
  type PokemonBinderOptions,
} from "@/lib/pokemon-binder";
import { play } from "@/lib/sound";
import type { CardWithSet, TcgSet } from "@/lib/tcg/types";

type PokemonBinderViewProps = {
  slug: string;
  displayName: string;
  cards: CardWithSet[];
  initialOptions: PokemonBinderOptions;
};

/** One Pokémon, every print, in a binder. Options live in the token URL. */
export function PokemonBinderView({ slug, displayName, cards, initialOptions }: PokemonBinderViewProps) {
  const [options, setOptions] = useState(initialOptions);
  const [customOpen, setCustomOpen] = useState(
    !POCKET_PRESETS.some((p) => p.rows === initialOptions.rows && p.cols === initialOptions.cols),
  );
  const router = useRouter();

  const layout = useMemo(() => buildPokemonLayout(cards, options), [cards, options]);

  const update = (patch: Partial<PokemonBinderOptions>) => {
    const next = { ...options, ...patch };
    setOptions(next);
    window.history.replaceState(null, "", `/pokemon/${encodePokemonToken(slug, next)}`);
  };

  // Languages change which cards are fetched, so navigate (the server re-renders
  // with the new card set) rather than just patching local state.
  const changeLanguages = (langs: string[]) => {
    router.push(`/pokemon/${encodePokemonToken(slug, { ...options, langs })}`);
  };

  const pseudoSet: TcgSet = {
    id: `pokemon-${slug}`,
    name: `${displayName} — all prints`,
    series: "Pokémon binder",
    printedTotal: 0,
    total: cards.length,
    releaseDate: "",
    symbolUrl: "",
    logoUrl: "",
  };

  const secretCount = cards.filter((c) => c.secret).length;
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
              label="Cards to include"
              value={options.filter}
              onChange={(filter) => update({ filter })}
              options={[
                { value: "all", label: "ALL PRINTS", hint: `every appearance (${cards.length})` },
                { value: "secret", label: "SECRETS ONLY", hint: `secret rares only (${secretCount})` },
                { value: "best", label: "RAREST PER SET", hint: "one chase card per set" },
              ]}
              className="min-w-64"
            />
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
          rememberKey={`pokemon:${slug}`}
          onInspect={(card) => {
            // The card detail page is English (pokemontcg.io) only; TCGdex cards
            // have no detail page yet, so they're not click-through.
            if ((card.lang ?? "en") !== "en") return;
            play("confirm");
            router.push(`/card/${card.id}`);
          }}
        />
      </GbScreen>

      <GbScreen title="PRINT & DOWNLOAD">
        <PdfButtons
          buttons={[
            { label: "BINDER PDF", type: "pokemon", token: encodePokemonToken(slug, options) },
            {
              label: "PLACEHOLDERS PDF",
              type: "pokemon-placeholders",
              token: encodePokemonToken(slug, options),
            },
          ]}
          printHref={`/print/pokemon?t=${encodeURIComponent(encodePokemonToken(slug, options))}`}
          filenameBase={`nomekop-${slug}`}
        />
      </GbScreen>
    </div>
  );
}
