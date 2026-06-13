"use client";

import { useMemo, useState } from "react";
import { GbScreen } from "@/components/gb/gb-screen";
import { GbStepper } from "@/components/gb/gb-stepper";
import { BinderPreview } from "@/components/builder/binder-preview";
import { buildPokemonLayout } from "@/lib/pokemon-binder";
import type { CardWithSet, TcgSet } from "@/lib/tcg/types";

type LocalizedSetBinderViewProps = {
  lang: string;
  setId: string;
  setName: string;
  cards: CardWithSet[];
};

/**
 * A standard binder for one localized (non-English) set — every card in number
 * order. No master mode, reverse holos, prices or click-through detail: TCGdex
 * doesn't carry that data. Just the cards, laid out and printable on screen.
 */
export function LocalizedSetBinderView({ lang, setId, setName, cards }: LocalizedSetBinderViewProps) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(4);

  const layout = useMemo(
    () => buildPokemonLayout(cards, { rows, cols, filter: "all", order: "new", langs: [lang] }),
    [cards, rows, cols, lang],
  );

  const pseudoSet: TcgSet = {
    id: setId,
    name: setName,
    series: "",
    printedTotal: 0,
    total: cards.length,
    releaseDate: "",
    symbolUrl: "",
    logoUrl: "",
    lang,
  };

  return (
    <div className="flex flex-col gap-6">
      <GbScreen title="BINDER OPTIONS">
        <div className="flex flex-wrap items-center gap-4">
          <GbStepper label="ROWS" value={rows} min={1} max={5} onChange={setRows} />
          <GbStepper label="COLS" value={cols} min={1} max={5} onChange={setCols} />
          <p aria-live="polite" className="font-pixel text-[10px] leading-relaxed sm:text-xs">
            {layout.stats.slots} POCKETS → {layout.stats.pages} PAGES
          </p>
        </div>
      </GbScreen>

      <GbScreen title="PREVIEW">
        <BinderPreview set={pseudoSet} layout={layout} />
      </GbScreen>
    </div>
  );
}
