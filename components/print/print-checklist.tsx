/* eslint-disable @next/next/no-img-element -- see print-binder.tsx */
import { PrintShell, proxiedImage } from "@/components/print/print-shell";
import type { Slot } from "@/lib/layout";
import type { BinderConfig } from "@/lib/config";
import type { TcgSet } from "@/lib/tcg/types";

const ROWS_PER_SHEET = 28;

type PrintChecklistProps = {
  set: TcgSet;
  /** Expanded slots (master mode = one row per pocket, incl. reverses). */
  slots: ReadonlyArray<Slot>;
  config: BinderConfig;
};

/** A4 checklist: one row per pocket with a tick box. */
export function PrintChecklist({ set, slots, config }: PrintChecklistProps) {
  const rows = slots.filter((s) => s.kind !== "empty");
  const sheets: Array<typeof rows> = [];
  for (let i = 0; i < rows.length; i += ROWS_PER_SHEET) {
    sheets.push(rows.slice(i, i + ROWS_PER_SHEET));
  }

  return (
    <PrintShell style={config.style}>
      {sheets.map((sheetRows, sheetIndex) => (
        <section key={sheetIndex} className="print-sheet">
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
              <strong>{set.name} — Checklist</strong>
            </span>
            <span>
              Sheet {sheetIndex + 1}/{sheets.length}
              {config.mode === "master" ? " · Master set" : ""}
            </span>
          </header>
          <table className="print-checklist-table">
            <thead>
              <tr>
                <th scope="col" aria-label="Collected" style={{ width: "8mm" }} />
                <th scope="col" style={{ width: "18mm" }}>
                  No.
                </th>
                <th scope="col">Name</th>
                <th scope="col" style={{ width: "40mm" }}>
                  Rarity
                </th>
                <th scope="col" style={{ width: "22mm" }}>
                  Variant
                </th>
              </tr>
            </thead>
            <tbody>
              {sheetRows.map((slot) => {
                const { card } = slot;
                return (
                  <tr key={`${card.id}-${slot.kind}`}>
                    <td>
                      <span className="print-tickbox" />
                    </td>
                    <td>{card.number}</td>
                    <td>{card.name}</td>
                    <td>{card.rarity ?? ""}</td>
                    <td>{slot.kind === "reverse" ? "Reverse holo" : "Normal"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <footer className="print-sheet-footer">
            <span>Bindermon</span>
            <span>
              {set.id} · {rows.length} pockets
            </span>
          </footer>
        </section>
      ))}
    </PrintShell>
  );
}
