import { describe, it, expect, beforeEach } from "vitest";
import {
  rememberScroll,
  recallScroll,
  MAX_SCROLL_ENTRIES,
  setRestoreIntent,
  consumeRestoreIntent,
} from "@/lib/scroll-memory";

beforeEach(() => sessionStorage.clear());

describe("scroll-memory", () => {
  it("remembers and recalls a scroll position by url", () => {
    rememberScroll("/pokemon/pikachu", 420);
    expect(recallScroll("/pokemon/pikachu")).toBe(420);
  });

  it("returns undefined for an unknown url", () => {
    expect(recallScroll("/never-visited")).toBeUndefined();
  });

  it("overwrites the position for the same url", () => {
    rememberScroll("/sets", 100);
    rememberScroll("/sets", 250);
    expect(recallScroll("/sets")).toBe(250);
  });

  it("floors fractional offsets and clamps negatives to zero", () => {
    rememberScroll("/a", 250.7);
    expect(recallScroll("/a")).toBe(250);
    rememberScroll("/b", -5);
    expect(recallScroll("/b")).toBe(0);
  });

  it("caps stored entries, evicting the oldest", () => {
    for (let i = 0; i < MAX_SCROLL_ENTRIES + 5; i++) rememberScroll(`/p/${i}`, i);
    expect(recallScroll("/p/0")).toBeUndefined(); // evicted
    expect(recallScroll(`/p/${MAX_SCROLL_ENTRIES + 4}`)).toBe(MAX_SCROLL_ENTRIES + 4); // newest kept
  });

  it("restore intent matches the target url once, then is consumed", () => {
    setRestoreIntent("/set/me4");
    expect(consumeRestoreIntent("/set/me4")).toBe(true);
    expect(consumeRestoreIntent("/set/me4")).toBe(false); // single-use
  });

  it("restore intent is single-use even on a non-matching navigation", () => {
    setRestoreIntent("/a");
    expect(consumeRestoreIntent("/b")).toBe(false); // wrong target — and cleared
    expect(consumeRestoreIntent("/a")).toBe(false); // so it can't fire later
  });

  it("consumeRestoreIntent with no intent is false and safe", () => {
    expect(consumeRestoreIntent("/x")).toBe(false);
  });

  it("survives corrupt storage without throwing", () => {
    sessionStorage.setItem("bindermon:v1:scroll", "{not json");
    expect(recallScroll("/x")).toBeUndefined();
    expect(() => rememberScroll("/x", 10)).not.toThrow();
    expect(recallScroll("/x")).toBe(10);
  });
});
