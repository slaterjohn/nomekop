"use client";

import { useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { play } from "@/lib/sound";
import { GbButton } from "@/components/gb/gb-button";
import { mulberry32 } from "@/lib/arcade-prng";
import { useBestScore, reportScore } from "@/lib/arcade-store";

// ORB FLIP — an original tile-flip risk/logic game.
// A grid hides power orbs (×1/×2/×3) and unstable cores (bombs). Flipping an orb
// multiplies your running charge; flip every orb to bank it. Hit a core and the
// charge is lost. Row/column hints (core count + orb-value sum) let you deduce a
// safe path — the logic layer that makes it more than a coin flip.

const COLS = 4;
const ROWS = 4;
const BOMBS = 3;

type Cell = { mult: number; bomb: boolean; flipped: boolean };

type Layout = {
  cells: Cell[];
  /** Total non-bomb tiles that must be cleared to win. */
  orbCount: number;
};

/** Deterministically build a grid from a seed: place bombs, fill the rest with
 *  weighted ×1/×2/×3 orbs (×1 common, ×3 rare — flipping a ×3 is the thrill). */
function buildLayout(seed: number): Layout {
  const rng = mulberry32(seed);
  const total = COLS * ROWS;
  const idx = Array.from({ length: total }, (_, i) => i);
  rng.shuffle(idx);
  const bombSet = new Set(idx.slice(0, BOMBS));
  const cells: Cell[] = [];
  for (let i = 0; i < total; i++) {
    if (bombSet.has(i)) {
      cells.push({ mult: 0, bomb: true, flipped: false });
    } else {
      const r = rng.next();
      const mult = r < 0.5 ? 1 : r < 0.85 ? 2 : 3;
      cells.push({ mult, bomb: false, flipped: false });
    }
  }
  return { cells, orbCount: total - BOMBS };
}

function rowBombs(cells: Cell[], row: number): number {
  let n = 0;
  for (let c = 0; c < COLS; c++) if (cells[row * COLS + c]!.bomb) n++;
  return n;
}
function rowSum(cells: Cell[], row: number): number {
  let s = 0;
  for (let c = 0; c < COLS; c++) s += cells[row * COLS + c]!.mult;
  return s;
}
function colBombs(cells: Cell[], col: number): number {
  let n = 0;
  for (let r = 0; r < ROWS; r++) if (cells[r * COLS + col]!.bomb) n++;
  return n;
}
function colSum(cells: Cell[], col: number): number {
  let s = 0;
  for (let r = 0; r < ROWS; r++) s += cells[r * COLS + col]!.mult;
  return s;
}

type Status = "playing" | "won" | "lost";

export function OrbFlip({ seed, onBack }: { seed: number; onBack: () => void }) {
  const headingId = useId();
  const best = useBestScore("orb-flip");

  // round bumps to reshuffle the layout deterministically on retry.
  const [round, setRound] = useState(0);
  const layout = useMemo(() => buildLayout(seed + round * 0x9e37), [seed, round]);

  const [cells, setCells] = useState<Cell[]>(() => layout.cells.map((c) => ({ ...c })));
  const [score, setScore] = useState(1);
  const [status, setStatus] = useState<Status>("playing");
  const [cursor, setCursor] = useState(0); // focused cell index
  const [cleared, setCleared] = useState(0);

  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // When the layout changes (retry), refs may be stale; focus is set on click.

  const reset = (nextRound: number) => {
    const next = buildLayout(seed + nextRound * 0x9e37);
    setRound(nextRound);
    setCells(next.cells.map((c) => ({ ...c })));
    setScore(1);
    setStatus("playing");
    setCleared(0);
    setCursor(0);
  };

  const flip = (i: number) => {
    if (status !== "playing") return;
    const cell = cells[i];
    if (!cell || cell.flipped) return;
    const nextCells = cells.slice();
    nextCells[i] = { ...cell, flipped: true };

    if (cell.bomb) {
      setCells(nextCells);
      setStatus("lost");
      play("back");
      return;
    }

    const nextScore = score * cell.mult;
    const nextCleared = cleared + 1;
    setCells(nextCells);
    setScore(nextScore);
    setCleared(nextCleared);

    if (nextCleared >= layout.orbCount) {
      setStatus("won");
      reportScore("orb-flip", nextScore);
      play("success");
    } else {
      play("confirm");
    }
  };

  const focusCell = (i: number) => {
    const n = (i + cells.length) % cells.length;
    setCursor(n);
    btnRefs.current[n]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        focusCell(row * COLS + ((col + 1) % COLS));
        break;
      case "ArrowLeft":
        e.preventDefault();
        focusCell(row * COLS + ((col - 1 + COLS) % COLS));
        break;
      case "ArrowDown":
        e.preventDefault();
        focusCell((((row + 1) % ROWS) * COLS) + col);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusCell((((row - 1 + ROWS) % ROWS) * COLS) + col);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        flip(i);
        break;
    }
  };

  const statusText =
    status === "won"
      ? `Cleared! Banked ${score} charge.`
      : status === "lost"
        ? `Busted on an unstable core. Charge lost at ${score}.`
        : `Charge ${score}. ${cleared} of ${layout.orbCount} orbs flipped.`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <header className="flex items-center justify-between gap-2">
        <h3 id={headingId} className="font-pixel text-xs uppercase">
          Orb Flip
        </h3>
        <p className="font-pixel text-[10px]">
          BEST <span data-testid="orb-best">{best}</span>
        </p>
      </header>

      <p
        role="status"
        aria-live="polite"
        data-testid="orb-status"
        className="min-h-6 font-pixel text-[10px] leading-relaxed"
      >
        {statusText}
      </p>

      <div className="flex justify-center">
        <div
          role="grid"
          aria-label="Orb Flip board"
          className="inline-grid gap-1"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr)) auto` }}
        >
          {Array.from({ length: ROWS }, (_, r) => (
            <div role="row" key={r} className="contents">
              {Array.from({ length: COLS }, (_, c) => {
                const i = r * COLS + c;
                const cell = cells[i]!;
                const label = cell.flipped
                  ? cell.bomb
                    ? "unstable core"
                    : `orb times ${cell.mult}`
                  : `hidden tile row ${r + 1} column ${c + 1}`;
                return (
                  <div role="gridcell" key={c} className="flex">
                    <button
                      type="button"
                      ref={(el) => {
                        btnRefs.current[i] = el;
                      }}
                      tabIndex={i === cursor ? 0 : -1}
                      aria-label={label}
                      aria-pressed={cell.flipped}
                      disabled={cell.flipped || status !== "playing"}
                      data-testid={`orb-cell-${i}`}
                      data-kind={cell.bomb ? "bomb" : `mult-${cell.mult}`}
                      onClick={() => flip(i)}
                      onKeyDown={(e) => onKeyDown(e, i)}
                      onFocus={() => setCursor(i)}
                      className={cn(
                        "flex h-11 w-11 items-center justify-center border-[3px] border-gb-ink font-pixel text-sm leading-none",
                        "disabled:cursor-default disabled:opacity-100",
                        !cell.flipped && "cursor-pointer bg-gb-accent text-transparent hover:-translate-y-px",
                        cell.flipped && cell.bomb && "bg-gb-ink text-gb-bg",
                        cell.flipped && !cell.bomb && "bg-gb-bg text-gb-ink",
                      )}
                    >
                      {cell.flipped ? (
                        cell.bomb ? (
                          <span aria-hidden="true">✸</span>
                        ) : (
                          <span aria-hidden="true">×{cell.mult}</span>
                        )
                      ) : (
                        <span aria-hidden="true">?</span>
                      )}
                    </button>
                  </div>
                );
              })}
              {/* Row hint: cores in this row · sum of orb values. */}
              <div role="gridcell" className="flex items-center pl-1">
                <span className="font-pixel text-[8px] leading-tight" aria-hidden="true">
                  ✸{rowBombs(layout.cells, r)} Σ{rowSum(layout.cells, r)}
                </span>
              </div>
            </div>
          ))}
          {/* Column hints row. */}
          <div role="row" className="contents">
            {Array.from({ length: COLS }, (_, c) => (
              <div role="gridcell" key={c} className="flex justify-center pt-1">
                <span className="font-pixel text-[8px] leading-tight" aria-hidden="true">
                  ✸{colBombs(layout.cells, c)}
                  <br />Σ{colSum(layout.cells, c)}
                </span>
              </div>
            ))}
            <div role="gridcell" aria-hidden="true" />
          </div>
        </div>
      </div>

      <p className="text-center font-pixel text-[8px] leading-relaxed">
        ✸ = cores in line · Σ = orb-value sum. Arrows move · Enter flips.
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {status !== "playing" ? (
          <GbButton size="sm" onClick={() => reset(round + 1)}>
            {status === "won" ? "Play again" : "Retry"}
          </GbButton>
        ) : null}
        <GbButton variant="b" size="sm" onClick={onBack}>
          ◀ Back
        </GbButton>
      </div>
    </section>
  );
}
