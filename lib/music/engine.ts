import { noteFreq, type Track, type Voice, type WaveType } from "@/lib/music/notes";

// The chiptune player: a Web Audio lookahead sequencer. A 25ms timer schedules
// each voice's notes ~120ms ahead off the audio clock, so loops are seamless and
// a track swap (on navigation) lands within a beat. All decoration — every call
// is wrapped so audio can never break the app, and it no-ops on the server.

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.12;
const DUCK_S = 0.18; // crossfade dip when swapping tracks
const DEFAULT_VOLUME = 0.18;

type Flat = { t: number; d: number; freq: number; wave: WaveType; gain: number };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
const pulseWaves = new Map<WaveType, PeriodicWave>();

let timer: ReturnType<typeof setInterval> | null = null;
let playing = false;
const volume = DEFAULT_VOLUME;

let current: Track | null = null;
let flat: Flat[] = [];
let loopSeconds = 0;
let secPerBeat = 0;
let loopStart = 0; // audio time of the current loop's beat 0
let cursor = 0; // next event in `flat` to schedule

const DUTY: Record<string, number> = { pulse12: 0.125, pulse25: 0.25, pulse50: 0.5 };

/** Band-limited pulse wave of a given duty cycle (the classic NES/GB timbres). */
function pulseWave(audio: AudioContext, wave: WaveType): PeriodicWave {
  const cached = pulseWaves.get(wave);
  if (cached) return cached;
  const n = 24;
  const real = new Float32Array(n + 1);
  const imag = new Float32Array(n + 1);
  const duty = DUTY[wave] ?? 0.5;
  for (let k = 1; k <= n; k++) imag[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
  const pw = audio.createPeriodicWave(real, imag, { disableNormalization: false });
  pulseWaves.set(wave, pw);
  return pw;
}

function makeNoiseBuffer(audio: AudioContext): AudioBuffer {
  const buf = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
  const data = buf.getChannelData(0);
  // Deterministic pseudo-noise (no Math.random — keep it pure-ish and stable).
  let x = 0x2545f491;
  for (let i = 0; i < data.length; i++) {
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    data[i] = (x / 0x7fffffff) % 1;
  }
  return buf;
}

function flatten(track: Track): Flat[] {
  const events: Flat[] = [];
  for (const voice of track.voices as Voice[]) {
    for (const note of voice.notes) {
      events.push({ t: note.t, d: note.d, freq: note.freq, wave: voice.wave, gain: voice.gain });
    }
  }
  return events.sort((a, b) => a.t - b.t);
}

function scheduleNote(ev: Flat, when: number): void {
  if (!ctx || !master) return;
  const gain = ctx.createGain();
  gain.connect(master);

  if (ev.wave === "noise") {
    // Percussive noise burst through a band-pass → kick / snare / hat colour.
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = ev.freq < 200 ? "lowpass" : "bandpass";
    bp.frequency.value = ev.freq;
    bp.Q.value = 1.3;
    src.connect(bp).connect(gain);
    const peak = ev.gain * volume * 2.2;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(peak, when + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + ev.d);
    src.start(when);
    src.stop(when + ev.d + 0.02);
    return;
  }

  const osc = ctx.createOscillator();
  if (ev.wave === "triangle") osc.type = "triangle";
  else osc.setPeriodicWave(pulseWave(ctx, ev.wave));
  osc.frequency.value = ev.freq;
  osc.connect(gain);
  // Pluck envelope: fast attack, short release so notes don't click or drone.
  const peak = ev.gain * volume;
  const dur = Math.max(ev.d, 0.06);
  const rel = Math.min(0.06, dur * 0.4);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(peak, when + 0.006);
  gain.gain.setValueAtTime(peak, when + dur - rel);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

function tick(): void {
  if (!ctx || !playing || flat.length === 0) return;
  const horizon = ctx.currentTime + SCHEDULE_AHEAD_S;
  // Schedule every event whose time is within the lookahead window, wrapping
  // the loop forever.
  let guard = 0;
  while (guard++ < 256) {
    if (cursor >= flat.length) {
      loopStart += loopSeconds;
      cursor = 0;
    }
    const ev = flat[cursor]!;
    const when = loopStart + ev.t * secPerBeat;
    if (when > horizon) break;
    scheduleNote(ev, when);
    cursor++;
  }
}

function ensureContext(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const Ctor = window.AudioContext;
    if (!Ctor) return false;
    if (!ctx) {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
      noiseBuffer = makeNoiseBuffer(ctx);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return true;
  } catch {
    return false;
  }
}

function load(track: Track, startAt: number): void {
  current = track;
  flat = flatten(track);
  secPerBeat = 60 / track.bpm;
  loopSeconds = track.beats * secPerBeat;
  loopStart = startAt;
  cursor = 0;
}

/** Start (or restart) playback on `track`. Must be called from a user gesture
 *  the first time so the AudioContext can start. */
export function startMusic(track: Track): void {
  if (!ensureContext() || !ctx || !master) return;
  try {
    playing = true;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(volume, ctx.currentTime);
    load(track, ctx.currentTime + 0.08);
    if (!timer) timer = setInterval(tick, LOOKAHEAD_MS);
    tick();
  } catch {
    /* decoration only */
  }
}

/** Crossfade to a different theme (a short dip then swap) — used on navigation. */
export function swapTrack(track: Track): void {
  if (!playing || !ctx || !master) return;
  if (current && current.id === track.id) return;
  try {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0.0001, now + DUCK_S);
    window.setTimeout(() => {
      if (!playing || !ctx || !master) return;
      load(track, ctx.currentTime + 0.05);
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
      master.gain.linearRampToValueAtTime(volume, ctx.currentTime + DUCK_S);
      tick();
    }, DUCK_S * 1000 + 20);
  } catch {
    /* decoration only */
  }
}

/** Stop playback and fade out the tail. */
export function stopMusic(): void {
  playing = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (ctx && master) {
    try {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0.0001, now + 0.2);
    } catch {
      /* ignore */
    }
  }
  current = null;
  flat = [];
}

/** A short original "power-on" arpeggio for the splash screen. Best-effort —
 *  browser autoplay policy keeps it silent until the audio is unlocked, which is
 *  fine; the splash is primarily visual. */
export function playJingle(): void {
  if (!ensureContext() || !ctx) return;
  try {
    const out = ctx.createGain();
    out.gain.value = 0.5;
    out.connect(ctx.destination);
    const notes = ["C5", "E5", "G5", "C6"];
    const step = 0.085;
    notes.forEach((name, i) => {
      const last = i === notes.length - 1;
      const t = ctx!.currentTime + 0.05 + i * step;
      const osc = ctx!.createOscillator();
      osc.setPeriodicWave(pulseWave(ctx!, "pulse50"));
      osc.frequency.value = noteFreq(name);
      const g = ctx!.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.2, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (last ? 0.45 : step));
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + (last ? 0.5 : step + 0.02));
    });
  } catch {
    /* decoration only */
  }
}

export function isPlaying(): boolean {
  return playing;
}

export function currentTrackId(): string | null {
  return current?.id ?? null;
}
