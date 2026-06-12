"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { play } from "@/lib/sound";
import { GbButton } from "@/components/gb/gb-button";
import { mulberry32, type Rng } from "@/lib/arcade-prng";
import { useBestScore, reportScore } from "@/lib/arcade-store";
import { useReducedMotion } from "@/lib/use-reduced-motion";

// SAFARI DASH — an original reaction/timing game.
// A Sparkmite darts through the tall grass. A marker sweeps a meter; land it in
// the lit catch-zone and press CATCH to snag the critter. Streaks build a combo
// (each catch is worth combo points) and the sweep speeds up. A miss resets the
// combo. Reduced-motion players nudge the marker by hand (arrows) — same logic,
// no animation — so the game is fully playable and deterministic under test.

const TRACK = 24; // marker positions across the meter (0..TRACK-1)
const ZONE = 5; // catch-zone width in positions

type Status = "ready" | "running" | "over";

/** Next catch-zone start, deterministic per attempt; keeps it off the edges. */
function nextZone(rng: Rng): number {
  return rng.int(TRACK - ZONE);
}

/** Frames-per-step for the sweep, easing faster as the combo grows. */
function stepDelay(combo: number): number {
  return Math.max(40, 150 - combo * 8);
}

export function SafariDash({ seed, onBack }: { seed: number; onBack: () => void }) {
  const headingId = useId();
  const reduced = useReducedMotion();
  const best = useBestScore("safari-dash");

  const rngRef = useRef<Rng>(mulberry32(seed));
  const [status, setStatus] = useState<Status>("ready");
  const [marker, setMarker] = useState(0);
  // Initial zone from a throwaway generator (same seed) — avoids reading the
  // live ref during render while staying deterministic.
  const [zone, setZone] = useState(() => nextZone(mulberry32(seed)));
  const [combo, setCombo] = useState(0);
  const [streakBest, setStreakBest] = useState(0);
  const [lastResult, setLastResult] = useState<"" | "catch" | "miss">("");

  // Live refs so the rAF loop and key handlers read fresh values. All writes
  // happen in effects / event handlers — never during render (react-compiler).
  const markerRef = useRef(marker);
  const comboRef = useRef(combo);
  useEffect(() => {
    markerRef.current = marker;
  }, [marker]);
  useEffect(() => {
    comboRef.current = combo;
  }, [combo]);

  const inZone = (m: number) => m >= zone && m < zone + ZONE;

  const start = () => {
    rngRef.current = mulberry32(seed);
    markerRef.current = 0;
    comboRef.current = 0;
    setStatus("running");
    setMarker(0);
    setCombo(0);
    setStreakBest(0);
    setLastResult("");
    setZone(nextZone(rngRef.current));
  };

  // Animated sweep: bounce the marker across the meter, accelerating with combo.
  // Self-contained (local m/d); reduced-motion skips it (player drives marker).
  // Re-subscribes when combo changes so the speed ramps; cheap (one rAF).
  useEffect(() => {
    if (status !== "running" || reduced) return;
    let raf = 0;
    let last = 0;
    let m = markerRef.current;
    let d = 1;
    const delay = stepDelay(combo);
    const tick = (t: number) => {
      if (t - last >= delay) {
        last = t;
        m += d;
        if (m >= TRACK - 1) {
          m = TRACK - 1;
          d = -1;
        } else if (m <= 0) {
          m = 0;
          d = 1;
        }
        markerRef.current = m;
        setMarker(m);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status, reduced, combo]);

  // Plain function (only ever called from event handlers): recreated each
  // render, so it closes over fresh `zone` / `streakBest` / `status`.
  const attemptCatch = () => {
    if (status !== "running") return;
    if (inZone(markerRef.current)) {
      const nextCombo = combo + 1;
      comboRef.current = nextCombo;
      setCombo(nextCombo);
      setStreakBest((s) => Math.max(s, nextCombo));
      setLastResult("catch");
      play("confirm");
      // Re-hide the critter in a fresh patch of grass.
      setZone(nextZone(rngRef.current));
    } else {
      // Miss: bank the streak, end the round (classic single-life dash).
      const finalStreak = Math.max(streakBest, combo);
      setStreakBest(finalStreak);
      setLastResult("miss");
      setStatus("over");
      reportScore("safari-dash", finalStreak);
      play("back");
    }
  };

  // Space to catch (works in both modes); arrows nudge in reduced-motion mode.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (status === "ready" || status === "over") {
        start();
      } else {
        attemptCatch();
      }
      return;
    }
    if (reduced && status === "running") {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setMarker((m) => Math.min(TRACK - 1, m + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setMarker((m) => Math.max(0, m - 1));
      }
    }
  };

  const statusText =
    status === "ready"
      ? "Press CATCH to send out a Sparkmite."
      : status === "over"
        ? `Missed! Final streak ${streakBest}.`
        : lastResult === "catch"
          ? `Caught! Combo ${combo}.`
          : `Combo ${combo}. Catch the Sparkmite in the lit zone.`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <header className="flex items-center justify-between gap-2">
        <h3 id={headingId} className="font-pixel text-xs uppercase">
          Safari Dash
        </h3>
        <p className="font-pixel text-[10px]">
          BEST <span data-testid="dash-best">{best}</span>
        </p>
      </header>

      <p
        role="status"
        aria-live="polite"
        data-testid="dash-status"
        className="min-h-6 font-pixel text-[10px] leading-relaxed"
      >
        {statusText}
      </p>

      <p className="font-pixel text-[10px]" aria-hidden="true">
        COMBO <span data-testid="dash-combo">{combo}</span>
      </p>

      {/* The meter: tall-grass cells, a lit catch-zone and the sweeping marker. */}
      <div
        // The whole game is operated from one focusable surface (button below);
        // this strip is purely visual.
        aria-hidden="true"
        className="flex flex-wrap gap-[2px] rounded-none border-[3px] border-gb-ink bg-gb-bg p-1"
        data-testid="dash-track"
        data-marker={marker}
        data-zone-start={zone}
        data-zone-end={zone + ZONE - 1}
      >
        {Array.from({ length: TRACK }, (_, i) => {
          const lit = i >= zone && i < zone + ZONE;
          const here = i === marker;
          return (
            <span
              key={i}
              className={cn(
                "flex h-7 w-3 items-end justify-center",
                lit ? "bg-gb-accent" : "bg-transparent",
              )}
            >
              {here ? (
                <span
                  className={cn(
                    "block h-7 w-3",
                    status === "running" ? "bg-gb-ink" : "bg-gb-ink/40",
                  )}
                />
              ) : (
                // grass blade tick
                <span className="block h-2 w-[2px] bg-gb-ink/50" />
              )}
            </span>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onKeyDown={onKeyDown}
          data-testid="dash-action"
          onClick={() => {
            if (status === "ready" || status === "over") start();
            else attemptCatch();
          }}
          className={cn(
            "inline-flex min-h-11 cursor-pointer items-center justify-center border-[3px] border-gb-ink bg-gb-accent px-4 py-2 font-pixel text-xs uppercase leading-none text-gb-ink",
            "shadow-[3px_3px_0_0_var(--gb-ink)] hover:-translate-y-px active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--gb-ink)]",
          )}
        >
          {status === "running" ? "Catch!" : status === "over" ? "Try again" : "Start"}
        </button>
        <GbButton variant="b" size="sm" onClick={onBack}>
          ◀ Back
        </GbButton>
      </div>

      <p className="text-center font-pixel text-[8px] leading-relaxed">
        {reduced
          ? "Reduced motion: ◀ ▶ aim the marker, SPACE to catch."
          : "SPACE / CATCH when the marker hits the lit zone."}
      </p>
    </section>
  );
}
