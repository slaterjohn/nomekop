"use client";

import { useMemo, useState } from "react";
import { GbStepper } from "@/components/gb/gb-stepper";
import { GbButton } from "@/components/gb/gb-button";
import { GbMenu } from "@/components/gb/gb-menu";
import { GbToggle } from "@/components/gb/gb-toggle";
import { buildBinderLayout } from "@/lib/layout";
import { POCKET_PRESETS, type BinderConfig } from "@/lib/config";
import { setHasBallPatterns } from "@/lib/tcg/ball-patterns";
import { play } from "@/lib/sound";
import type { TcgCard, TcgSet } from "@/lib/tcg/types";

type ConfigPanelProps = {
  set: TcgSet;
  cards: ReadonlyArray<TcgCard>;
  config: BinderConfig;
  onChange: (patch: Partial<BinderConfig>) => void;
};

/** Pocket-count presets (+ custom grid), collection mode, variant options. */
export function ConfigPanel({ set, cards, config, onChange }: ConfigPanelProps) {
  const stats = useMemo(() => buildBinderLayout(cards, set, config).stats, [cards, set, config]);

  const matchingPreset = POCKET_PRESETS.find(
    (p) => p.rows === config.rows && p.cols === config.cols,
  );
  const [customOpen, setCustomOpen] = useState(!matchingPreset);
  const showSteppers = customOpen || !matchingPreset;

  const ballSet = setHasBallPatterns(set.id);
  // No parallel prints (e.g. Base Set) → the master set IS the complete set:
  // hide the mode choice entirely instead of offering a meaningless toggle.
  const hasParallels = cards.some(
    (c) => c.variants.reverse || c.variants.pokeball || c.variants.masterball,
  );
  const showBallOptions = config.mode === "master" && ballSet;
  const showPlacement = config.mode === "master" && hasParallels;

  return (
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
                onChange({ rows: preset.rows, cols: preset.cols });
              }}
            >
              {preset.label}
            </GbButton>
          );
        })}
        <GbButton
          variant={showSteppers ? "a" : "b"}
          size="sm"
          aria-pressed={showSteppers}
          onClick={() => {
            play("confirm");
            setCustomOpen(true);
          }}
        >
          CUSTOM
        </GbButton>
      </div>

      {showSteppers ? (
        <div className="flex flex-wrap items-center gap-4">
          <GbStepper
            label="ROWS"
            value={config.rows}
            min={1}
            max={5}
            onChange={(rows) => onChange({ rows })}
          />
          <GbStepper
            label="COLS"
            value={config.cols}
            min={1}
            max={5}
            onChange={(cols) => onChange({ cols })}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-start gap-4">
        {hasParallels ? (
          <GbMenu
            label="Collection mode"
            value={config.mode}
            onChange={(mode) => onChange({ mode })}
            options={[
              { value: "standard", label: "STANDARD", hint: "one pocket per card" },
              {
                value: "master",
                label: "MASTER",
                hint: ballSet ? "reverses + ball patterns" : "adds reverse holos",
              },
            ]}
            className="min-w-64"
          />
        ) : (
          <p className="border-[3px] border-gb-ink bg-gb-accent/40 px-3 py-2 font-pixel text-[10px] leading-relaxed">
            COMPLETE SET — NO PARALLEL PRINTS EXIST. ONE POCKET PER CARD.
          </p>
        )}
        <div className="flex flex-col gap-1">
          <GbToggle
            label="SECRET RARES"
            checked={config.secrets}
            onChange={(secrets) => onChange({ secrets })}
          />
          {showBallOptions ? (
            <>
              <GbToggle
                label="POKÉ BALL"
                checked={config.pb}
                onChange={(pb) => onChange({ pb })}
              />
              <GbToggle
                label="MASTER BALL"
                checked={config.mb}
                onChange={(mb) => onChange({ mb })}
              />
            </>
          ) : null}
        </div>
        {showPlacement ? (
          <GbMenu
            label="Variant placement"
            value={config.place}
            onChange={(place) => onChange({ place })}
            options={[
              { value: "mix", label: "INTERLEAVED", hint: "variants beside each card" },
              { value: "end", label: "AT END", hint: "variant runs after the main set" },
            ]}
            className="min-w-64"
          />
        ) : null}
      </div>

      <p aria-live="polite" className="font-pixel text-[10px] leading-relaxed sm:text-xs">
        {stats.cards} CARDS → {stats.slots} POCKETS → {stats.pages} PAGES
        {config.mode === "master" && stats.slots > stats.byKind.card ? (
          <span className="mt-1 block text-[9px]">
            INCL. {stats.byKind.reverse} REVERSE
            {stats.byKind.pokeball > 0 ? ` · ${stats.byKind.pokeball} POKÉ BALL` : ""}
            {stats.byKind.masterball > 0 ? ` · ${stats.byKind.masterball} MASTER BALL` : ""}
            {config.place === "end" ? " — VARIANT RUNS SIT ON THE FINAL PAGES" : ""}
          </span>
        ) : null}
      </p>
    </div>
  );
}
