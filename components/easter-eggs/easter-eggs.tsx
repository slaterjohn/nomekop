"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { play } from "@/lib/sound";
import { PixelPokeball } from "@/components/gb/pixel-pokeball";
import { makeSeed } from "@/lib/arcade-prng";
import {
  markDiscovered,
  useDiscovered,
  useBestScore,
  type ArcadeGameId,
} from "@/lib/arcade-store";
import { OrbFlip } from "@/components/easter-eggs/games/orb-flip";
import { SafariDash } from "@/components/easter-eggs/games/safari-dash";
import { EchoMatch } from "@/components/easter-eggs/games/echo-match";

// ── Secret arcade: discovery shell ──────────────────────────────────────────
// A self-contained Easter egg. Three ways in (all original, IP-safe):
//   1. The Konami code:  ↑ ↑ ↓ ↓ ← → ← → B A
//   2. Typing the word   MISSINGNO   anywhere on the page
//   3. triggerArcade()   — an exported hook so an external element (e.g. a
//      footer pokeball someone wires up later) can open it too.
// Everything below mounts from a single <EasterEggs/>; it touches no layout.

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
] as const;

const SECRET_WORD = "MISSINGNO";

// Module-level pub/sub so triggerArcade() can reach the mounted component from
// anywhere (no context provider needed for a single global egg).
const openListeners = new Set<() => void>();

/** Open the secret arcade programmatically (e.g. from an external trigger). */
export function triggerArcade(): void {
  openListeners.forEach((l) => l());
}

/** Subscribe to open requests; returns an unsubscribe. Exposed for wiring. */
export function subscribeArcade(onOpen: () => void): () => void {
  openListeners.add(onOpen);
  return () => openListeners.delete(onOpen);
}

type View = "menu" | ArcadeGameId;

const GAMES: Array<{ id: ArcadeGameId; title: string; blurb: string }> = [
  { id: "orb-flip", title: "Orb Flip", blurb: "Flip orbs, dodge cores. Push your luck." },
  { id: "safari-dash", title: "Safari Dash", blurb: "Time the catch. Build a combo." },
  { id: "echo-match", title: "Echo Match", blurb: "Find the critter pairs from memory." },
];

/** A menu row showing a game + its best score, opened on click/Enter/Space. */
function GameMenuItem({
  game,
  onOpen,
}: {
  game: (typeof GAMES)[number];
  onOpen: () => void;
}) {
  const best = useBestScore(game.id);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "flex w-full items-center gap-3 border-[3px] border-gb-ink bg-gb-bg p-2 text-left",
          "cursor-pointer shadow-[3px_3px_0_0_var(--gb-ink)] hover:-translate-y-px",
          "active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--gb-ink)]",
        )}
      >
        <PixelPokeball size={20} />
        <span className="flex flex-1 flex-col">
          <span className="font-pixel text-xs uppercase">{game.title}</span>
          <span className="font-body text-base leading-tight">{game.blurb}</span>
        </span>
        <span className="font-pixel text-[10px] uppercase">Best {best}</span>
      </button>
    </li>
  );
}

type EasterEggsProps = {
  /**
   * Deterministic seed for game layouts. Defaults to a constant so tests are
   * reproducible; production overrides it with a per-mount seed derived from
   * performance.now() inside an effect (never during render).
   */
  seed?: number;
};

const DEFAULT_SEED = 0x00c0ffee;

export function EasterEggs({ seed }: EasterEggsProps) {
  const [open, setOpen] = useState(false);
  const [announce, setAnnounce] = useState(false); // "unlocked" toast flag
  const [view, setView] = useState<View>("menu");
  const discovered = useDiscovered();

  // Effective seed: the prop wins (tests, fully deterministic); otherwise a
  // production seed minted once on first open (an event, never during render —
  // performance.now() varies the layout per session). Games only mount after
  // open, so the seed is always ready by then.
  const [autoSeed, setAutoSeed] = useState<number | null>(null);
  const effectiveSeed = seed ?? autoSeed ?? DEFAULT_SEED;

  const konamiPos = useRef(0);
  const wordBuf = useRef("");
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unlock = useCallback(() => {
    setView("menu");
    setOpen(true);
    setAnnounce(true);
    setAutoSeed((prev) => prev ?? makeSeed());
    markDiscovered();
    play("success");
    if (announceTimer.current) clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => setAnnounce(false), 2600);
  }, []);

  // External triggers (triggerArcade / subscribeArcade).
  useEffect(() => subscribeArcade(unlock), [unlock]);

  // Global key listener: Konami sequence + MISSINGNO buffer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack typing in inputs/textareas/contenteditable.
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable) return;
      }

      // Konami: compare case-insensitively for the trailing b / a.
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const expected = KONAMI[konamiPos.current];
      if (key === expected) {
        konamiPos.current += 1;
        if (konamiPos.current === KONAMI.length) {
          konamiPos.current = 0;
          unlock();
        }
      } else {
        // Restart, but allow the just-pressed key to begin a fresh sequence.
        konamiPos.current = key === KONAMI[0] ? 1 : 0;
      }

      // MISSINGNO buffer: accumulate letters, reset on any non-letter.
      if (/^[a-zA-Z]$/.test(e.key)) {
        wordBuf.current = (wordBuf.current + e.key.toUpperCase()).slice(-SECRET_WORD.length);
        if (wordBuf.current === SECRET_WORD) {
          wordBuf.current = "";
          unlock();
        }
      } else {
        wordBuf.current = "";
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [unlock]);

  useEffect(() => {
    return () => {
      if (announceTimer.current) clearTimeout(announceTimer.current);
    };
  }, []);

  const closeArcade = useCallback((next: boolean) => {
    if (!next) {
      setOpen(false);
      play("back");
    }
  }, []);

  return (
    <>
      {/* Floating reopen button — appears once the arcade has been discovered. */}
      {discovered ? (
        <button
          type="button"
          aria-label="Open secret arcade"
          data-testid="arcade-reopen"
          data-no-click-sound
          onClick={unlock}
          className={cn(
            "fixed bottom-4 left-4 z-40 inline-flex h-12 w-12 items-center justify-center",
            "cursor-pointer rounded-none border-[3px] border-gb-ink bg-gb-bg",
            "shadow-[3px_3px_0_0_var(--gb-ink)] hover:-translate-y-px",
            "active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--gb-ink)]",
            "motion-safe:animate-[gb-wobble_2.4s_steps(4,end)_infinite]",
          )}
        >
          <PixelPokeball size={26} />
        </button>
      ) : null}

      {/* Unlock announcement — a polite live region (no flashing, auto-dismiss).
          Mirrors the GB dialogue-box look without the typewriter. */}
      <div aria-live="polite" className="sr-only">
        {announce ? "Secret arcade unlocked." : ""}
      </div>
      {announce ? (
        <div
          data-testid="arcade-toast"
          className={cn(
            "fixed left-1/2 top-4 z-[60] -translate-x-1/2",
            "border-4 border-double border-gb-ink bg-gb-bg px-4 py-2",
            "shadow-[inset_0_0_0_2px_var(--gb-bg),inset_0_0_0_4px_var(--gb-ink),4px_4px_0_0_var(--gb-ink)]",
          )}
        >
          <p className="font-pixel text-[10px] uppercase leading-relaxed text-gb-ink">
            ★ Secret arcade unlocked ★
          </p>
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={closeArcade}>
        <DialogContent
          data-no-click-sound
          className="max-h-[90vh] gap-0 overflow-y-auto rounded-none border-4 border-gb-ink bg-gb-bg p-0 shadow-[6px_6px_0_0_var(--gb-ink)] sm:max-w-md"
        >
          <DialogHeader className="border-b-4 border-gb-ink bg-gb-ink px-4 py-3 text-left">
            <DialogTitle className="flex items-center gap-2 font-pixel text-sm uppercase text-gb-bg">
              <PixelPokeball size={18} />
              Secret Arcade
            </DialogTitle>
            <DialogDescription className="font-body text-lg text-gb-bg">
              {view === "menu"
                ? "Original Game-Boy-style mini-games. Pick one to play."
                : "Press BACK to return to the arcade menu."}
            </DialogDescription>
          </DialogHeader>

          <div className="p-4">
            {view === "menu" ? (
              <nav aria-label="Arcade games">
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {GAMES.map((game) => (
                    <GameMenuItem
                      key={game.id}
                      game={game}
                      onOpen={() => {
                        play("confirm");
                        setView(game.id);
                      }}
                    />
                  ))}
                </ul>
              </nav>
            ) : null}

            {view === "orb-flip" ? (
              <OrbFlip seed={effectiveSeed} onBack={() => setView("menu")} />
            ) : null}
            {view === "safari-dash" ? (
              <SafariDash seed={effectiveSeed} onBack={() => setView("menu")} />
            ) : null}
            {view === "echo-match" ? (
              <EchoMatch seed={effectiveSeed} onBack={() => setView("menu")} />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
