import { pat, drums, voiceBeats, type Track, type Voice } from "@/lib/music/notes";

// Original chiptune themes — composed as note patterns, NOT sampled from anything.
// Four Game Boy voices: a pulse lead, a pulse arpeggio, a triangle bass, and a
// noise drum kit. Each navigates an area like the handheld games: the home/title
// theme, a couple of "route" themes, a calm "town", a quirky "lab".

const E = 0.5; // an eighth note, in beats
const B = 1; // a quarter (one beat)
const S = 0.25; // a sixteenth — the drum grid

// Reusable one-bar (4-beat) drum patterns.
const DR_BASIC = "K - H - S - H - K - H - S - H -";
const DR_BUSY = "K H H H S H H H K H K H S H H H";
const DR_SOFT = "K - - - S - - - - - - - S - - -";
const DR_DRIVE = "K - H K S - H - K - H K S - H K";

const rep = (bar: string, n: number) => Array(n).fill(bar).join(" ");

function lead(p: string): Voice {
  return { wave: "pulse50", gain: 0.5, notes: pat(p, E) };
}
function harmony(p: string, gain = 0.26): Voice {
  return { wave: "pulse25", gain, notes: pat(p, E) };
}
function bass(p: string): Voice {
  return { wave: "triangle", gain: 0.55, notes: pat(p, B) };
}
function kit(p: string): Voice {
  return { wave: "noise", gain: 0.3, notes: drums(p, S) };
}

/** Loop length = the longest voice, rounded up to a whole beat, so a small
 *  authoring mismatch still loops cleanly (shorter voices just rest the tail). */
function track(id: string, name: string, bpm: number, voices: Voice[]): Track {
  const beats = Math.ceil(Math.max(...voices.map((v) => voiceBeats(v.notes))) - 1e-6);
  return { id, name, bpm, beats, voices };
}

// ── 0 · TITLE — bright C major (home) ──────────────────────────────────────
const title = track("title", "Title", 144, [
  lead(
    "E4 G4 C5 G4 E4 G4 A4 G4 D4 G4 B4 G4 D4 G4 A4 B4 " +
      "C5 B4 A4 G4 E4 G4 A4 C5 A4 G4 F4 A4 G4 F4 E4 C4",
  ),
  harmony(
    "C4 E4 G4 E4 C4 E4 G4 E4 D4 G4 B4 G4 D4 G4 B4 G4 " +
      "A3 C4 E4 C4 A3 C4 E4 C4 F3 A3 C4 A3 F3 A3 C4 A3",
  ),
  bass("C2 E2 G2 E2 G2 B2 D3 B2 A2 C3 E3 C3 F2 A2 C3 A2"),
  kit(rep(DR_BASIC, 4)),
]);

// ── 1 · ROUTE — adventurous G major (Pokémon binders) ──────────────────────
const route = track("route", "Route", 152, [
  lead(
    "D4 G4 B4 D5 B4 G4 A4 B4 A4 F#4 D4 F#4 A4 F#4 E4 D4 " +
      "E4 G4 B4 G4 C5 B4 A4 G4 D5 B4 G4 A4 B4 D5 D4 G4",
  ),
  harmony(
    "G4 B4 D5 B4 G4 B4 D5 B4 D4 F#4 A4 F#4 D4 F#4 A4 F#4 " +
      "E4 G4 B4 G4 E4 G4 B4 G4 C4 E4 G4 E4 D4 F#4 A4 F#4",
  ),
  bass("G2 D3 G3 D3 D2 A2 D3 A2 E2 B2 E3 B2 C2 G2 D3 G2"),
  kit(rep(DR_DRIVE, 4)),
]);

// ── 2 · TOWN — calm F major (sets, Pokédex, facts) ─────────────────────────
const town = track("town", "Town", 116, [
  lead(
    "A4 C5 A4 F4 G4 A4 G4 E4 F4 A4 C5 D5 C5 A4 G4 F4 " +
      "C5 A4 F4 A4 Bb4 A4 G4 F4 G4 A4 Bb4 C5 A4 G4 F4 C4",
  ),
  harmony(
    "F3 A3 C4 A3 F3 A3 C4 A3 C4 E4 G4 E4 C4 E4 G4 E4 " +
      "D4 F4 A4 F4 D4 F4 A4 F4 Bb3 D4 F4 D4 C4 E4 G4 E4",
    0.22,
  ),
  bass("F2 C3 F3 C3 C2 G2 C3 G2 D2 A2 D3 A2 Bb1 F2 C3 F2"),
  kit(rep(DR_SOFT, 4)),
]);

// ── 3 · LAB — quirky A minor (illustrator) ─────────────────────────────────
const lab = track("lab", "Lab", 132, [
  lead(
    "A4 C5 E5 C5 A4 G4 E4 G4 F4 A4 C5 A4 G4 E4 D4 E4 " +
      "C5 B4 A4 G4 E4 F4 G4 A4 G4 E4 D4 B3 E4 G#4 B4 E5",
  ),
  harmony(
    "A3 C4 E4 C4 A3 C4 E4 C4 F3 A3 C4 A3 F3 A3 C4 A3 " +
      "C4 E4 G4 E4 C4 E4 G4 E4 E4 G#4 B4 G#4 E4 G#4 B4 G#4",
  ),
  bass("A2 E3 A3 E3 F2 C3 F3 C3 C2 G2 C3 G2 E2 B2 E3 B2"),
  kit(rep(DR_BUSY, 4)),
]);

// ── 4 · SHOP — bouncy D major (set builder, binders) ───────────────────────
const shop = track("shop", "Shop", 126, [
  lead(
    "F#4 A4 D5 A4 F#4 A4 B4 A4 E4 A4 C#5 A4 E4 A4 B4 C#5 " +
      "D5 C#5 B4 A4 F#4 A4 B4 D5 G4 B4 A4 F#4 A4 E4 D4 A4",
  ),
  harmony(
    "D4 F#4 A4 F#4 D4 F#4 A4 F#4 A3 C#4 E4 C#4 A3 C#4 E4 C#4 " +
      "B3 D4 F#4 D4 B3 D4 F#4 D4 G3 B3 D4 B3 A3 C#4 E4 C#4",
  ),
  bass("D2 A2 D3 A2 A2 E3 A3 E3 B2 F#3 B3 F#3 G2 D3 A3 D3"),
  kit(rep(DR_BASIC, 4)),
]);

export const TRACKS: Track[] = [title, route, town, lab, shop];

/** Which theme an area starts from (index into TRACKS). The store adds a random
 *  per-load offset on top, so reloads vary and navigating between areas swaps
 *  the theme — Game-Boy-style. */
export function baseTrackIndex(path: string): number {
  if (path.startsWith("/pokemon")) return 1;
  if (path.startsWith("/pokedex")) return 2;
  if (path.startsWith("/illustrator")) return 3;
  if (
    path.startsWith("/build") ||
    path.startsWith("/b/") ||
    path.startsWith("/binders") ||
    path.startsWith("/set") ||
    path.startsWith("/card") ||
    path.startsWith("/collection")
  ) {
    return 4;
  }
  if (path.startsWith("/facts") || path.startsWith("/legal")) return 2;
  return 0; // home + anything else → title
}

/** Resolve a path + per-load offset to a concrete theme. */
export function trackForPath(path: string, offset: number): Track {
  const index = (baseTrackIndex(path) + offset) % TRACKS.length;
  return TRACKS[index]!;
}
