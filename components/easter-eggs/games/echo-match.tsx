"use client";

import { useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { play } from "@/lib/sound";
import { GbButton } from "@/components/gb/gb-button";
import { mulberry32 } from "@/lib/arcade-prng";
import { useBestScore, reportScore } from "@/lib/arcade-store";

// ECHO MATCH — an original memory game.
// Six pairs of invented critters hide under face-down tiles. Flip two; a match
// locks them, a mismatch flips back. Clear the board — fewer moves scores higher
// (perfect = 6 moves). Best score persisted. Original pixel glyphs only: no
// licensed art anywhere near this thing.

const PAIRS = 6;
const COLS = 4; // 12 tiles → 3 rows × 4 cols

/** Original pixel critters, drawn as tiny 5×5-ish SVG blobs (no real species). */
const CRITTERS: Array<{ id: string; name: string; cells: Array<[number, number]>; fill: string }> = [
  { id: "glooble", name: "Glooble", fill: "var(--gb-ink)", cells: [[1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2], [3, 2], [0, 3], [3, 3]] },
  { id: "sparkmite", name: "Sparkmite", fill: "var(--gb-ink)", cells: [[2, 0], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2], [1, 3], [2, 3]] },
  { id: "voltnut", name: "Voltnut", fill: "var(--gb-ink)", cells: [[1, 0], [2, 0], [0, 1], [3, 1], [0, 2], [3, 2], [1, 3], [2, 3]] },
  { id: "mossling", name: "Mossling", fill: "var(--gb-ink)", cells: [[0, 0], [3, 0], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2], [1, 3], [2, 3]] },
  { id: "puddol", name: "Puddol", fill: "var(--gb-ink)", cells: [[1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2], [3, 2], [1, 3], [2, 3]] },
  { id: "cindr", name: "Cindr", fill: "var(--gb-ink)", cells: [[2, 0], [1, 1], [2, 1], [3, 1], [0, 2], [2, 2], [1, 3], [2, 3], [3, 3]] },
];

function CritterGlyph({ index }: { index: number }) {
  const c = CRITTERS[index % CRITTERS.length]!;
  return (
    <svg viewBox="0 0 4 4" width={28} height={28} shapeRendering="crispEdges" aria-hidden="true">
      {c.cells.map(([x, y], k) => (
        <rect key={k} x={x} y={y} width={1} height={1} fill={c.fill} />
      ))}
    </svg>
  );
}

type Tile = { id: number; critter: number; flipped: boolean; matched: boolean };

/** Deterministic shuffled deck of paired critters from a seed. */
function buildDeck(seed: number): Tile[] {
  const rng = mulberry32(seed);
  const ids: number[] = [];
  for (let p = 0; p < PAIRS; p++) ids.push(p, p);
  rng.shuffle(ids);
  return ids.map((critter, id) => ({ id, critter, flipped: false, matched: false }));
}

/** Score rewards efficiency: perfect (PAIRS moves) tops out, decays per extra. */
function scoreFor(moves: number): number {
  const perfect = PAIRS;
  const penalty = Math.max(0, moves - perfect);
  return Math.max(10, 1000 - penalty * 60);
}

export function EchoMatch({ seed, onBack }: { seed: number; onBack: () => void }) {
  const headingId = useId();
  const best = useBestScore("echo-match");

  const [round, setRound] = useState(0);
  const initial = useMemo(() => buildDeck(seed + round * 0x2545), [seed, round]);

  const [tiles, setTiles] = useState<Tile[]>(initial);
  const [first, setFirst] = useState<number | null>(null); // index of first flipped
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [locked, setLocked] = useState(false); // brief lock during mismatch flip-back
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const rows = Math.ceil(tiles.length / COLS);
  const won = matchedPairs >= PAIRS;

  const reset = (nextRound: number) => {
    if (timer.current) clearTimeout(timer.current);
    setRound(nextRound);
    setTiles(buildDeck(seed + nextRound * 0x2545));
    setFirst(null);
    setMoves(0);
    setMatchedPairs(0);
    setCursor(0);
    setLocked(false);
  };

  const flip = (i: number) => {
    if (locked || won) return;
    const tile = tiles[i];
    if (!tile || tile.flipped || tile.matched) return;

    const next = tiles.slice();
    next[i] = { ...tile, flipped: true };

    if (first === null) {
      setTiles(next);
      setFirst(i);
      play("move");
      return;
    }

    // Second pick — count the move, resolve match/mismatch.
    const a = next[first]!;
    const b = next[i]!;
    setMoves((m) => m + 1);

    if (a.critter === b.critter) {
      next[first] = { ...a, matched: true };
      next[i] = { ...b, matched: true };
      setTiles(next);
      setFirst(null);
      const pairs = matchedPairs + 1;
      setMatchedPairs(pairs);
      if (pairs >= PAIRS) {
        reportScore("echo-match", scoreFor(moves + 1));
        play("success");
      } else {
        play("confirm");
      }
    } else {
      setTiles(next);
      setLocked(true);
      play("back");
      const flipBack = () => {
        setTiles((cur) =>
          cur.map((t, idx) => (idx === i || idx === first ? { ...t, flipped: false } : t)),
        );
        setFirst(null);
        setLocked(false);
      };
      // Short pause so the second face is visible before it flips back.
      timer.current = setTimeout(flipBack, 700);
    }
  };

  const focusTile = (i: number) => {
    const n = (i + tiles.length) % tiles.length;
    setCursor(n);
    btnRefs.current[n]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const colsInRow = Math.min(COLS, tiles.length - row * COLS);
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        focusTile(row * COLS + ((col + 1) % colsInRow));
        break;
      case "ArrowLeft":
        e.preventDefault();
        focusTile(row * COLS + ((col - 1 + colsInRow) % colsInRow));
        break;
      case "ArrowDown":
        e.preventDefault();
        focusTile(((row + 1) % rows) * COLS + col);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusTile(((row - 1 + rows) % rows) * COLS + col);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        flip(i);
        break;
    }
  };

  const statusText = won
    ? `Solved in ${moves} moves! Score ${scoreFor(moves)}.`
    : `Moves ${moves}. Pairs ${matchedPairs} of ${PAIRS}.`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <header className="flex items-center justify-between gap-2">
        <h3 id={headingId} className="font-pixel text-xs uppercase">
          Echo Match
        </h3>
        <p className="font-pixel text-[10px]">
          BEST <span data-testid="echo-best">{best}</span>
        </p>
      </header>

      <p
        role="status"
        aria-live="polite"
        data-testid="echo-status"
        className="min-h-6 font-pixel text-[10px] leading-relaxed"
      >
        {statusText}
      </p>

      <div className="flex justify-center">
        {/* A group of toggle buttons (not a data grid) — arrow keys rove focus
            in 2D, each button announces its own state. */}
        <div
          role="group"
          aria-label="Echo Match board"
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        >
          {tiles.map((tile, i) => {
            const face = tile.flipped || tile.matched;
            const critterName = CRITTERS[tile.critter % CRITTERS.length]!.name;
            return (
              <button
                key={tile.id}
                type="button"
                ref={(el) => {
                  btnRefs.current[i] = el;
                }}
                tabIndex={i === cursor ? 0 : -1}
                aria-label={face ? critterName : `face-down tile ${i + 1}`}
                aria-pressed={face}
                disabled={tile.matched}
                data-testid={`echo-cell-${i}`}
                data-critter={tile.critter}
                data-face={face ? "up" : "down"}
                onClick={() => flip(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
                onFocus={() => setCursor(i)}
                className={cn(
                  "flex h-12 w-12 items-center justify-center border-[3px] border-gb-ink",
                  "disabled:cursor-default",
                  face ? "bg-gb-bg" : "cursor-pointer bg-gb-accent hover:-translate-y-px",
                  tile.matched && "opacity-70",
                )}
              >
                {face ? (
                  <CritterGlyph index={tile.critter} />
                ) : (
                  <span aria-hidden="true" className="font-pixel text-sm text-gb-ink">
                    ?
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-center font-pixel text-[8px] leading-relaxed">
        Match the pairs · Arrows move · Enter flips.
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {won ? (
          <GbButton size="sm" onClick={() => reset(round + 1)}>
            Play again
          </GbButton>
        ) : null}
        <GbButton variant="b" size="sm" onClick={onBack}>
          ◀ Back
        </GbButton>
      </div>
    </section>
  );
}
