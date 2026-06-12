"use client";

import { useCallback, useSyncExternalStore } from "react";

// 8-bit cue synth. Muted by default — sound is a treat you opt into, never an
// ambush. No audio assets: square waves straight from WebAudio.

const KEY = "bindermon:v1:sound";

const listeners = new Set<() => void>();
let memoryEnabled: boolean | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
  } catch {
    // fall through
  }
  return memoryEnabled ?? false;
}

export function useSoundEnabled(): { enabled: boolean; setEnabled: (on: boolean) => void } {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const setEnabled = useCallback((on: boolean) => {
    memoryEnabled = on;
    try {
      localStorage.setItem(KEY, on ? "1" : "0");
    } catch {
      // best-effort persistence
    }
    emit();
  }, []);
  return { enabled, setEnabled };
}

export type SoundCue = "move" | "confirm" | "back" | "success";

const CUES: Record<SoundCue, Array<{ freq: number; at: number; dur: number }>> = {
  move: [{ freq: 440, at: 0, dur: 0.05 }],
  confirm: [{ freq: 660, at: 0, dur: 0.07 }],
  back: [{ freq: 330, at: 0, dur: 0.06 }],
  success: [
    { freq: 523, at: 0, dur: 0.09 },
    { freq: 659, at: 0.09, dur: 0.09 },
    { freq: 784, at: 0.18, dur: 0.16 },
  ],
};

const VOLUME = 0.08;
/** Safety lead so events never land behind the audio clock (a fresh context's
 *  clock advances past `currentTime` before the graph is processed, clamping
 *  the envelope to silence — the classic swallowed-first-blip bug). */
const SCHEDULE_LEAD_S = 0.04;

let ctx: AudioContext | null = null;

/** Plays a cue if sound is enabled. Safe to call anywhere (no-ops on SSR). */
export function play(cue: SoundCue): void {
  if (typeof window === "undefined" || !getSnapshot()) return;
  try {
    const Ctor = window.AudioContext;
    if (!Ctor) return;
    ctx = ctx ?? new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime + SCHEDULE_LEAD_S;
    for (const note of CUES[cue]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = note.freq;
      gain.gain.setValueAtTime(VOLUME, t0 + note.at);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + note.at + note.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + note.at);
      osc.stop(t0 + note.at + note.dur + 0.01);
    }
  } catch {
    // Audio is decoration; never let it break the app.
  }
}

/** Test-only: reset module state. */
export function __resetSoundForTests(): void {
  memoryEnabled = null;
  ctx = null;
}
