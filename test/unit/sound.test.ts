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
  connect = vi.fn(() => new FakeGain());
  start = vi.fn();
  stop = vi.fn();
}

function stubAudioContext() {
  const instances: FakeAudioContext[] = [];
  class FakeAudioContext {
    state = "running";
    currentTime = 0;
    destination = {};
    oscillators: FakeOsc[] = [];
    constructor() {
      instances.push(this);
    }
    createOscillator() {
      const osc = new FakeOsc();
      this.oscillators.push(osc);
      return osc;
    }
    createGain() {
      return new FakeGain();
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
});
