"use client";

import { useMemo, useState } from "react";
import { GbStepper } from "@/components/gb/gb-stepper";
import { GbButton } from "@/components/gb/gb-button";
import { GbMenu } from "@/components/gb/gb-menu";
import { GbToggle } from "@/components/gb/gb-toggle";
import { buildBinderLayout } from "@/lib/layout";
import { POCKET_PRESETS, type BinderConfig } from "@/lib/config";
import { setHasBallPatterns, setPatternKinds } from "@/lib/tcg/ball-patterns";
import { play } from "@/lib/sound";
import { capture } from "@/lib/analytics/events";
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
  const patternKinds = setPatternKinds(set.id);
  // No parallel prints (e.g. Base Set) → the master set IS the complete set:
  // hide the mode choice entirely instead of offering a meaningless toggle.
  const hasParallels = cards.some(
    (c) =>
      c.variants.reverse ||
      c.variants.pokeball ||
      c.variants.masterball ||
      c.variants.energy,
  );
  const showBallOptions = config.mode === "master" && ballSet;
  const showPlacement = config.mode === "master" && hasParallels;

  // One discriminated analytics event for every config tweak.
  const logConfig = (field: string, value: string | number | boolean) =>
    capture("binder_config_changed", { field, value, set: set.id });

  return (
    <div className="flex flex-col gap-4" data-no-click-sound>
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
                logConfig("grid", `${preset.rows}x${preset.cols}`);
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
            logConfig("grid", "custom");
          }}
        >
          Custom
        </GbButton>
      </div>

      {showSteppers ? (
        <div className="flex flex-wrap items-center gap-4">
          <GbStepper
            label="Rows"
            value={config.rows}
            min={1}
            max={5}
            onChange={(rows) => {
              logConfig("grid", `${rows}x${config.cols}`);
              onChange({ rows });
            }}
          />
          <GbStepper
            label="Cols"
            value={config.cols}
            min={1}
            max={5}
            onChange={(cols) => {
              logConfig("grid", `${config.rows}x${cols}`);
              onChange({ cols });
            }}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-start gap-4">
        {hasParallels ? (
          <GbMenu
            label="Collection mode"
            value={config.mode}
            onChange={(mode) => {
              logConfig("mode", mode);
              onChange({ mode });
            }}
            options={[
              { value: "standard", label: "Standard", hint: "one pocket per card" },
              {
                value: "master",
                label: "Master",
                hint: ballSet ? "reverses + ball patterns" : "adds reverse holos",
              },
            ]}
            className="min-w-64"
          />
        ) : (
          <p className="border-[3px] border-gb-ink bg-gb-accent/40 px-3 py-2 font-pixel text-[10px] uppercase leading-relaxed">
            Complete set — no parallel prints exist. One pocket per card.
          </p>
        )}
        <div className="flex flex-col gap-1">
          <GbToggle
            label="Secret rares"
            checked={config.secrets}
            onChange={(secrets) => {
              logConfig("secrets", secrets);
              onChange({ secrets });
            }}
          />
          {showBallOptions ? (
            <>
              {patternKinds.pokeball ? (
                <GbToggle
                  label="Poké Ball"
                  checked={config.pb}
                  onChange={(pb) => {
                    logConfig("pokeball", pb);
                    onChange({ pb });
                  }}
                />
              ) : null}
              {patternKinds.masterball ? (
                <GbToggle
                  label="Master Ball"
                  checked={config.mb}
                  onChange={(mb) => {
                    logConfig("masterball", mb);
                    onChange({ mb });
                  }}
                />
              ) : null}
              {patternKinds.energy ? (
                <GbToggle
                  label="Energy"
                  checked={config.ep}
                  onChange={(ep) => {
                    logConfig("energy", ep);
                    onChange({ ep });
                  }}
                />
              ) : null}
            </>
          ) : null}
        </div>
        {showPlacement ? (
          <GbMenu
            label="Variant placement"
            value={config.place}
            onChange={(place) => onChange({ place })}
            options={[
              { value: "mix", label: "Interleaved", hint: "variants beside each card" },
              { value: "end", label: "At end", hint: "variant runs after the main set" },
            ]}
            className="min-w-64"
          />
        ) : null}
      </div>

      <p aria-live="polite" className="font-pixel text-[10px] uppercase leading-relaxed sm:text-xs">
        {stats.cards} cards → {stats.slots} pockets → {stats.pages} pages
        {config.mode === "master" && stats.slots > stats.byKind.card ? (
          <span className="mt-1 block text-[9px]">
            Incl. {stats.byKind.reverse} reverse
            {stats.byKind.pokeball > 0 ? ` · ${stats.byKind.pokeball} Poké Ball` : ""}
            {stats.byKind.masterball > 0 ? ` · ${stats.byKind.masterball} Master Ball` : ""}
            {stats.byKind.energy > 0 ? ` · ${stats.byKind.energy} Energy` : ""}
            {config.place === "end" ? " — variant runs sit on the final pages" : ""}
          </span>
        ) : null}
      </p>
    </div>
  );
}
