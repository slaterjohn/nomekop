"use client";

import { useMemo } from "react";
import { GbStepper } from "@/components/gb/gb-stepper";
import { GbButton } from "@/components/gb/gb-button";
import { GbMenu } from "@/components/gb/gb-menu";
import { GbToggle } from "@/components/gb/gb-toggle";
import { buildBinderLayout } from "@/lib/layout";
import { LAYOUT_PRESETS, type BinderConfig } from "@/lib/config";
import { play } from "@/lib/sound";
import type { TcgCard, TcgSet } from "@/lib/tcg/types";

type ConfigPanelProps = {
  set: TcgSet;
  cards: ReadonlyArray<TcgCard>;
  config: BinderConfig;
  onChange: (patch: Partial<BinderConfig>) => void;
};

/** Grid size, layout presets, collection mode and secret-rare toggle. */
export function ConfigPanel({ set, cards, config, onChange }: ConfigPanelProps) {
  const stats = useMemo(
    () => buildBinderLayout(cards, set, config).stats,
    [cards, set, config],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <GbStepper
          label="ROWS"
          value={config.rows}
          min={1}
          max={5}
          onChange={(rows) => {
            play("move");
            onChange({ rows });
          }}
        />
        <GbStepper
          label="COLS"
          value={config.cols}
          min={1}
          max={5}
          onChange={(cols) => {
            play("move");
            onChange({ cols });
          }}
        />
        <div role="group" aria-label="Layout presets" className="flex flex-wrap gap-2">
          {LAYOUT_PRESETS.map((preset) => {
            const active = preset.rows === config.rows && preset.cols === config.cols;
            return (
              <GbButton
                key={preset.label}
                variant={active ? "a" : "b"}
                size="sm"
                aria-pressed={active}
                onClick={() => {
                  play("confirm");
                  onChange({ rows: preset.rows, cols: preset.cols });
                }}
              >
                {preset.label}
              </GbButton>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <GbMenu
          label="Collection mode"
          value={config.mode}
          onChange={(mode) => {
            play("confirm");
            onChange({ mode });
          }}
          options={[
            { value: "standard", label: "STANDARD", hint: "one pocket per card" },
            { value: "master", label: "MASTER", hint: "reverse holos interleaved" },
          ]}
          className="min-w-64"
        />
        <GbToggle
          label="SECRET RARES"
          checked={config.secrets}
          onChange={(secrets) => {
            play("move");
            onChange({ secrets });
          }}
        />
      </div>

      <p aria-live="polite" className="font-pixel text-[10px] leading-relaxed sm:text-xs">
        {stats.cards} CARDS → {stats.slots} POCKETS → {stats.pages} PAGES
      </p>
    </div>
  );
}
