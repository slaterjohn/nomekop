import { describe, it, expect, beforeEach } from "vitest";
import { pushTrail, readTrail, MAX_TRAIL } from "@/lib/nav-trail";

beforeEach(() => sessionStorage.clear());

describe("nav-trail", () => {
  it("pushes visited pages in order", () => {
    pushTrail("/sets", "All sets");
    pushTrail("/set/me4", "Chaos Rising");
    expect(readTrail()).toEqual([
      { url: "/sets", label: "All sets" },
      { url: "/set/me4", label: "Chaos Rising" },
    ]);
  });

  it("collapses the trail when revisiting an earlier page (back / loop)", () => {
    pushTrail("/sets", "All sets");
    pushTrail("/set/me4", "Chaos Rising");
    pushTrail("/card/me4-1", "Weedle");
    // Going back to the set truncates the steps after it.
    pushTrail("/set/me4", "Chaos Rising");
    expect(readTrail()).toEqual([
      { url: "/sets", label: "All sets" },
      { url: "/set/me4", label: "Chaos Rising" },
    ]);
  });

  it("treats the same page re-render as a no-op (refreshes label only)", () => {
    pushTrail("/set/me4", "Chaos Rising");
    pushTrail("/set/me4", "Chaos Rising (86 cards)");
    expect(readTrail()).toEqual([{ url: "/set/me4", label: "Chaos Rising (86 cards)" }]);
  });

  it("caps the trail length, dropping the oldest", () => {
    for (let i = 0; i < MAX_TRAIL + 4; i++) pushTrail(`/p/${i}`, `P${i}`);
    const trail = readTrail();
    expect(trail).toHaveLength(MAX_TRAIL);
    expect(trail[0]!.url).toBe(`/p/4`); // first 4 dropped
    expect(trail[trail.length - 1]!.url).toBe(`/p/${MAX_TRAIL + 3}`);
  });

  it("survives corrupt storage", () => {
    sessionStorage.setItem("bindermon:v1:trail", "{bad");
    expect(readTrail()).toEqual([]);
    expect(() => pushTrail("/x", "X")).not.toThrow();
    expect(readTrail()).toEqual([{ url: "/x", label: "X" }]);
  });
});
