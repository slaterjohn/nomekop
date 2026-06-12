/* eslint-disable @next/next/no-img-element -- see print-binder.tsx */
import { PrintShell, proxiedImage } from "@/components/print/print-shell";
import { slotKindLabel } from "@/lib/variant-labels";
import type { Slot } from "@/lib/layout";
import type { BinderConfig } from "@/lib/config";
import type { TcgSet } from "@/lib/tcg/types";

const PER_SHEET = 6; // 2 × 3 true-size cards per A4

type PrintPlaceholdersProps = {
  set: TcgSet;
  slots: ReadonlyArray<Slot>;
  config: BinderConfig;
};

/** Cut-out 63×88mm placeholders to mark empty pockets, with crop marks. */
export function PrintPlaceholders({ set, slots, config }: PrintPlaceholdersProps) {
  const cards = slots.filter((s) => s.kind !== "empty");
  const sheets: Array<typeof cards> = [];
  for (let i = 0; i < cards.length; i += PER_SHEET) {
    sheets.push(cards.slice(i, i + PER_SHEET));
  }

  return (
    <PrintShell style={config.style}>
      {sheets.map((sheetCards, sheetIndex) => (
        <section key={sheetIndex} className="print-sheet">
          <header className="print-sheet-header">
            <strong>{set.name} — Pocket placeholders</strong>
            <span>
              Sheet {sheetIndex + 1}/{sheets.length}
            </span>
          </header>
          <div className="print-placeholder-grid">
            {sheetCards.map((slot) => {
              const { card } = slot;
              return (
                <div key={`${card.id}-${slot.kind}`} className="print-placeholder">
                  <span className="print-crop print-crop-tl" />
                  <span className="print-crop print-crop-tr" />
                  <span className="print-crop print-crop-bl" />
                  <span className="print-crop print-crop-br" />
                  {set.symbolUrl ? (
                    <img src={proxiedImage(set.symbolUrl)} alt="" width={24} height={24} />
                  ) : null}
                  <span className="print-placeholder-name">{card.name}</span>
                  <span className="print-placeholder-number">
                    {card.number}/{set.printedTotal}
                    {slot.kind !== "card" ? ` · ${slotKindLabel(slot.kind).toUpperCase()}` : ""}
                    {card.rarity ? ` · ${card.rarity}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
          <footer className="print-sheet-footer">
            <span>Nomekop</span>
            <span>cut along the dashed lines</span>
          </footer>
        </section>
      ))}
    </PrintShell>
  );
}
