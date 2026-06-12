/* eslint-disable @next/next/no-img-element -- print views render plain <img>
   for exact mm-based sizing; next/image optimization is pointless on paper. */
import { PrintShell, proxiedImage } from "@/components/print/print-shell";
import { cardAlt } from "@/lib/card-alt";
import { slotBadge } from "@/lib/variant-labels";
import type { BinderLayout } from "@/lib/layout";
import type { BinderConfig } from "@/lib/config";
import type { TcgSet } from "@/lib/tcg/types";

type PrintBinderProps = {
  set: TcgSet;
  layout: BinderLayout;
  config: BinderConfig;
};

/** A4 binder pages: one binder page per sheet, grid of card pockets. */
export function PrintBinder({ set, layout, config }: PrintBinderProps) {
  return (
    <PrintShell style={config.style}>
      {layout.pages.map((page) => (
        <section key={page.number} className="print-sheet">
          <header className="print-sheet-header">
            <span style={{ display: "inline-flex", alignItems: "center", gap: "2mm" }}>
              {set.symbolUrl ? (
                <img
                  src={proxiedImage(set.symbolUrl)}
                  alt=""
                  width={24}
                  height={24}
                  style={{ width: "6mm", height: "6mm" }}
                />
              ) : null}
              <strong>{set.name}</strong>
            </span>
            <span>
              Page {page.number}/{layout.stats.pages} · {layout.stats.rows}×{layout.stats.cols}
              {config.mode === "master" ? " · Master set" : ""}
            </span>
          </header>
          <div
            className="print-grid"
            style={{
              gridTemplateColumns: `repeat(${layout.stats.cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${layout.stats.rows}, minmax(0, 1fr))`,
            }}
          >
            {page.slots.map((slot, i) => {
              if (slot.kind === "empty") {
                return <div key={`empty-${i}`} className="print-slot print-slot-empty" />;
              }
              const { card } = slot;
              return (
                <div key={`${card.id}-${slot.kind}`} className="print-slot">
                  <div className="print-slot-image">
                    {card.imageSmall ? (
                      <img
                        src={proxiedImage(card.imageSmall)}
                        alt={cardAlt(card.name, card.number, set.printedTotal, card.rarity)}
                        width={245}
                        height={342}
                      />
                    ) : null}
                    {slotBadge(slot.kind) ? (
                      <span className="print-rev-badge">{slotBadge(slot.kind)}</span>
                    ) : slot.kind === "card" && card.variants.holo ? (
                      <span className="print-rev-badge">HOLO</span>
                    ) : null}
                  </div>
                  <div className="print-slot-label">
                    {card.name} · {card.number}
                    {card.rarity ? ` · ${card.rarity}` : ""}
                  </div>
                </div>
              );
            })}
          </div>
          <footer className="print-sheet-footer">
            <span>Nomekop</span>
            <span>
              {set.id} · {config.mode} · secrets {config.secrets ? "on" : "off"}
            </span>
          </footer>
        </section>
      ))}
    </PrintShell>
  );
}
