/* eslint-disable @next/next/no-img-element -- see print-binder.tsx */
import { PrintShell, proxiedImage } from "@/components/print/print-shell";
import { spriteUrl, type PokedexEntry, type Generation } from "@/lib/pokedex";

const PLACEHOLDERS_PER_SHEET = 6;

type PrintPokedexProps = {
  gen: Generation;
  entries: PokedexEntry[];
  rows: number;
  cols: number;
  view: "binder" | "placeholders";
};

/** A4 Pokédex sheets: binder pages of chosen cards, or cut-out placeholders
 *  with the matching pixel icon set (consistent Gen-VIII menu sprites). */
export function PrintPokedex({ gen, entries, rows, cols, view }: PrintPokedexProps) {
  if (view === "placeholders") {
    const sheets: PokedexEntry[][] = [];
    for (let i = 0; i < entries.length; i += PLACEHOLDERS_PER_SHEET) {
      sheets.push(entries.slice(i, i + PLACEHOLDERS_PER_SHEET));
    }
    return (
      <PrintShell style="clean">
        {sheets.map((sheet, sheetIndex) => (
          <section key={sheetIndex} className="print-sheet">
            <header className="print-sheet-header">
              <strong>{gen.region} Pokédex — pocket placeholders</strong>
              <span>
                Sheet {sheetIndex + 1}/{sheets.length}
              </span>
            </header>
            <div className="print-placeholder-grid">
              {sheet.map((entry) => {
                const sprite = spriteUrl(entry.dex);
                return (
                  <div key={entry.dex} className="print-placeholder">
                    <span className="print-crop print-crop-tl" />
                    <span className="print-crop print-crop-tr" />
                    <span className="print-crop print-crop-bl" />
                    <span className="print-crop print-crop-br" />
                    {sprite ? (
                      <img
                        src={proxiedImage(sprite)}
                        alt=""
                        width={68}
                        height={56}
                        style={{ width: "18mm", height: "15mm", objectFit: "contain", imageRendering: "pixelated" }}
                      />
                    ) : (
                      <span style={{ fontSize: "18pt" }} aria-hidden="true">
                        ◓
                      </span>
                    )}
                    <span className="print-placeholder-name">#{entry.dex}</span>
                    <span className="print-placeholder-number">
                      {entry.chosen ? entry.chosen.name : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
            <footer className="print-sheet-footer">
              <span>Bindermon Pokédex</span>
              <span>cut along the dashed lines</span>
            </footer>
          </section>
        ))}
      </PrintShell>
    );
  }

  const perPage = rows * cols;
  const pages: PokedexEntry[][] = [];
  for (let i = 0; i < entries.length; i += perPage) {
    pages.push(entries.slice(i, i + perPage));
  }

  return (
    <PrintShell style="clean">
      {pages.map((pageEntries, pageIndex) => (
        <section key={pageIndex} className="print-sheet">
          <header className="print-sheet-header">
            <strong>{gen.region} Pokédex</strong>
            <span>
              Page {pageIndex + 1}/{pages.length} · {rows}×{cols} · #{gen.min}–{gen.max}
            </span>
          </header>
          <div
            className="print-grid"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            }}
          >
            {pageEntries.map((entry) => (
              <div key={entry.dex} className={entry.chosen ? "print-slot" : "print-slot print-slot-empty"}>
                <div className="print-slot-image">
                  {entry.chosen?.imageSmall ? (
                    <img
                      src={proxiedImage(entry.chosen.imageSmall)}
                      alt={`${entry.chosen.name} · #${entry.dex}`}
                      width={245}
                      height={342}
                    />
                  ) : spriteUrl(entry.dex) ? (
                    <img
                      src={proxiedImage(spriteUrl(entry.dex)!)}
                      alt=""
                      width={68}
                      height={56}
                      style={{ width: "16mm", height: "13mm", objectFit: "contain", imageRendering: "pixelated" }}
                    />
                  ) : null}
                </div>
                <div className="print-slot-label">
                  #{entry.dex}
                  {entry.chosen ? ` · ${entry.chosen.name} · ${entry.chosen.setName}` : " · no card yet"}
                </div>
              </div>
            ))}
          </div>
          <footer className="print-sheet-footer">
            <span>Bindermon Pokédex</span>
            <span>
              {gen.label} · {gen.region}
            </span>
          </footer>
        </section>
      ))}
    </PrintShell>
  );
}
