// Pure music-data helpers for the chiptune engine — no Web Audio here, so it's
// all unit-testable. Notes are named (C4, F#3, Eb5); patterns are compact
// strings parsed into timed events the sequencer schedules.

export type WaveType = "pulse12" | "pulse25" | "pulse50" | "triangle" | "noise";

/** A timed event in a loop: start `t` (beats from loop start), duration `d`
 *  (beats), and a frequency in Hz (for noise voices, the burst's centre). */
export type Note = { t: number; d: number; freq: number };

export type Voice = {
  wave: WaveType;
  /** 0..1 voice level, before the master music gain. */
  gain: number;
  notes: Note[];
};

export type Track = {
  id: string;
  name: string;
  bpm: number;
  /** Loop length in beats; the pattern repeats seamlessly every `beats`. */
  beats: number;
  voices: Voice[];
};

const SEMITONE: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5,
  "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};

/** Note name (e.g. "A4", "C#5", "Eb3") → MIDI number. A4 = 69. */
export function midi(name: string): number {
  const m = /^([A-G][#b]?)(-?\d+)$/.exec(name);
  if (!m) throw new Error(`bad note: ${name}`);
  const semis = SEMITONE[m[1]!];
  if (semis === undefined) throw new Error(`bad note: ${name}`);
  return (Number.parseInt(m[2]!, 10) + 1) * 12 + semis;
}

/** MIDI number → frequency (Hz), equal temperament, A4 = 440. */
export function freqFromMidi(m: number): number {
  return 440 * 2 ** ((m - 69) / 12);
}

export function noteFreq(name: string): number {
  return freqFromMidi(midi(name));
}

/** Game Boy "drum" colours for the noise channel — a centre frequency the
 *  noise burst is filtered around, plus how long it rings. */
export const DRUMS: Record<string, { freq: number; d: number }> = {
  K: { freq: 90, d: 0.14 }, // kick
  S: { freq: 1700, d: 0.12 }, // snare
  H: { freq: 8000, d: 0.04 }, // hi-hat
};

/**
 * Parse a melodic pattern: space-separated tokens, each lasting one `step`
 * (beats). A token is a note ("C4"), a rest ("-"), or either with a "*k"
 * sustain/hold ("C4*4", "-*2"). Sustained notes ring for k steps.
 */
export function pat(str: string, step: number): Note[] {
  const notes: Note[] = [];
  let t = 0;
  for (const token of str.trim().split(/\s+/).filter(Boolean)) {
    const m = /^(-|[A-G][#b]?-?\d+)(?:\*(\d+))?$/.exec(token);
    if (!m) throw new Error(`bad token: ${token}`);
    const span = (m[2] ? Number.parseInt(m[2], 10) : 1) * step;
    if (m[1] !== "-") notes.push({ t, d: span, freq: noteFreq(m[1]!) });
    t += span;
  }
  return notes;
}

/**
 * Parse a drum pattern: tokens K (kick), S (snare), H (hi-hat) or "-" (rest),
 * each one `step` long. Hits are percussive — duration comes from DRUMS, not the
 * step — so the grid can be dense.
 */
export function drums(str: string, step: number): Note[] {
  const notes: Note[] = [];
  let t = 0;
  for (const token of str.trim().split(/\s+/).filter(Boolean)) {
    const m = /^(-|[KSH])(?:\*(\d+))?$/.exec(token);
    if (!m) throw new Error(`bad drum token: ${token}`);
    const reps = m[2] ? Number.parseInt(m[2], 10) : 1;
    if (m[1] !== "-") {
      const hit = DRUMS[m[1]!]!;
      notes.push({ t, d: hit.d, freq: hit.freq });
    }
    t += reps * step;
  }
  return notes;
}

/** Total beats a voice spans (for sanity-checking a track's loop length). */
export function voiceBeats(notes: Note[]): number {
  return notes.reduce((max, n) => Math.max(max, n.t + n.d), 0);
}
