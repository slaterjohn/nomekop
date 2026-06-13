// @vitest-environment node
import { describe, it, expect } from "vitest";
import { midi, noteFreq, pat, drums, voiceBeats, DRUMS } from "@/lib/music/notes";
import { TRACKS, baseTrackIndex, trackForPath } from "@/lib/music/tracks";

describe("note maths", () => {
  it("maps note names to MIDI numbers", () => {
    expect(midi("A4")).toBe(69);
    expect(midi("C4")).toBe(60);
    expect(midi("C#4")).toBe(61);
    expect(midi("Db4")).toBe(61);
    expect(midi("C-1")).toBe(0);
  });

  it("maps MIDI to equal-tempered frequency (A4 = 440)", () => {
    expect(noteFreq("A4")).toBeCloseTo(440, 5);
    expect(noteFreq("C4")).toBeCloseTo(261.63, 1);
    expect(noteFreq("A5")).toBeCloseTo(880, 5);
  });

  it("rejects malformed note names", () => {
    expect(() => midi("H4")).toThrow();
    expect(() => midi("C")).toThrow();
  });
});

describe("pattern parser", () => {
  it("places notes at cumulative beat positions, honouring rests and sustains", () => {
    const notes = pat("C4 - E4*2 G4", 0.5);
    expect(notes).toHaveLength(3); // the rest produces no note
    expect(notes[0]).toMatchObject({ t: 0, d: 0.5 });
    expect(notes[0]!.freq).toBeCloseTo(noteFreq("C4"), 3);
    // C4 (0.5) + rest (0.5) → E4 starts at 1.0, lasts 2 steps = 1.0
    expect(notes[1]).toMatchObject({ t: 1, d: 1 });
    // then G4 at 2.0
    expect(notes[2]!.t).toBe(2);
  });

  it("parses drum hits to their preset colours", () => {
    const notes = drums("K - S H", 0.25);
    expect(notes).toHaveLength(3);
    expect(notes[0]).toMatchObject({ t: 0, freq: DRUMS.K!.freq });
    expect(notes[1]).toMatchObject({ t: 0.5, freq: DRUMS.S!.freq }); // after K + rest
    expect(notes[2]!.freq).toBe(DRUMS.H!.freq);
  });

  it("voiceBeats reports the span to the last note's end", () => {
    expect(voiceBeats(pat("C4 D4 E4 F4", 1))).toBe(4);
  });
});

describe("themes", () => {
  it("ships several distinct, well-formed tracks", () => {
    expect(TRACKS.length).toBeGreaterThanOrEqual(4);
    const ids = new Set(TRACKS.map((t) => t.id));
    expect(ids.size).toBe(TRACKS.length); // unique ids
    for (const track of TRACKS) {
      expect(track.bpm).toBeGreaterThan(60);
      expect(track.beats).toBeGreaterThan(0);
      expect(track.voices.length).toBeGreaterThanOrEqual(3);
      for (const voice of track.voices) {
        expect(voice.notes.length).toBeGreaterThan(0);
        for (const note of voice.notes) {
          expect(Number.isFinite(note.freq)).toBe(true);
          expect(note.freq).toBeGreaterThan(0);
          expect(note.d).toBeGreaterThan(0);
          // every note starts within the loop
          expect(note.t).toBeLessThan(track.beats);
        }
      }
    }
  });
});

describe("route → theme mapping", () => {
  it("maps each area to a distinct base theme", () => {
    expect(baseTrackIndex("/")).toBe(0);
    expect(baseTrackIndex("/pokemon/charizard~34an")).toBe(1);
    expect(baseTrackIndex("/pokedex/g1~34")).toBe(2);
    expect(baseTrackIndex("/illustrator/ken-sugimori~34n")).toBe(3);
    expect(baseTrackIndex("/binders")).toBe(4);
    expect(baseTrackIndex("/set/base1")).toBe(4);
    expect(baseTrackIndex("/b/sv1~34m111ic")).toBe(4);
    expect(baseTrackIndex("/facts")).toBe(2);
  });

  it("applies the per-load offset and wraps within the track list", () => {
    const n = TRACKS.length;
    // offset shifts the area's theme; wraps around the list
    expect(trackForPath("/", 0).id).toBe(TRACKS[0]!.id);
    expect(trackForPath("/", 1).id).toBe(TRACKS[1 % n]!.id);
    expect(trackForPath("/", n).id).toBe(TRACKS[0]!.id); // full wrap
  });
});
