// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { play, useSoundEnabled, __resetSoundForTests } from "@/lib/sound";

class FakeGain {
  gain = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
  connect = vi.fn(() => this);
}
class FakeOsc {
  type = "";
  frequency = { value: 0 };
  connect = vi.fn((node: FakeGain) => node);
  start = vi.fn();
  stop = vi.fn();
}

function stubAudioContext(currentTime = 0) {
  const instances: FakeAudioContext[] = [];
  class FakeAudioContext {
    state = "running";
    currentTime = currentTime;
    destination = {};
    oscillators: FakeOsc[] = [];
    gains: FakeGain[] = [];
    constructor() {
      instances.push(this);
    }
    createOscillator() {
      const osc = new FakeOsc();
      this.oscillators.push(osc);
      return osc;
    }
    createGain() {
      const gain = new FakeGain();
      this.gains.push(gain);
      return gain;
    }
    resume = vi.fn();
  }
  vi.stubGlobal("AudioContext", FakeAudioContext);
  return instances;
}

beforeEach(() => {
  localStorage.clear();
  __resetSoundForTests();
  vi.unstubAllGlobals();
});

describe("sound", () => {
  it("is muted by default: play() never constructs an AudioContext", () => {
    const instances = stubAudioContext();
    play("confirm");
    expect(instances).toHaveLength(0);
  });

  it("toggle persists to localStorage", () => {
    const { result } = renderHook(() => useSoundEnabled());
    expect(result.current.enabled).toBe(false);
    act(() => result.current.setEnabled(true));
    expect(result.current.enabled).toBe(true);
    expect(localStorage.getItem("bindermon:v1:sound")).toBe("1");
    act(() => result.current.setEnabled(false));
    expect(localStorage.getItem("bindermon:v1:sound")).toBe("0");
  });

  it("plays square-wave notes when enabled", () => {
    const instances = stubAudioContext();
    localStorage.setItem("bindermon:v1:sound", "1");
    play("success");
    expect(instances).toHaveLength(1);
    expect(instances[0]!.oscillators).toHaveLength(3); // arpeggio
    expect(instances[0]!.oscillators[0]!.type).toBe("square");
  });

  it("reuses one AudioContext across plays", () => {
    const instances = stubAudioContext();
    localStorage.setItem("bindermon:v1:sound", "1");
    play("move");
    play("back");
    expect(instances).toHaveLength(1);
  });

  it("never throws when AudioContext is unavailable", () => {
    vi.stubGlobal("AudioContext", undefined);
    localStorage.setItem("bindermon:v1:sound", "1");
    expect(() => play("confirm")).not.toThrow();
  });

  it("schedules notes safely ahead of the audio clock (regression: swallowed first blip)", () => {
    // Events scheduled at exactly currentTime land in the past once the audio
    // thread catches up, clamping the gain envelope to silence.
    const instances = stubAudioContext(5);
    localStorage.setItem("bindermon:v1:sound", "1");
    play("confirm");
    const gainCalls = instances[0]!.gains[0]!.gain.setValueAtTime.mock.calls;
    expect(gainCalls.length).toBeGreaterThan(0);
    const [volume, when] = gainCalls[0]! as [number, number];
    expect(when).toBeGreaterThanOrEqual(5.02);
    expect(volume).toBeGreaterThanOrEqual(0.05); // audible on laptop speakers
  });
});
