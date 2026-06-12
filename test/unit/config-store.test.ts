import { describe, it, expect, beforeEach } from "vitest";
import { loadSetConfig, saveSetConfig } from "@/lib/config-store";
import { DEFAULT_CONFIG } from "@/lib/config";
import { recommendPreset, evaluatePresets, ZIP_BINDER_PAGES } from "@/lib/binders";

beforeEach(() => {
  localStorage.clear();
});

describe("per-set config persistence", () => {
  it("round-trips non-default settings per set", () => {
    saveSetConfig({
      ...DEFAULT_CONFIG,
      set: "sv8pt5",
      rows: 4,
      cols: 4,
      mode: "master",
      mb: false,
      place: "end",
    });
    expect(loadSetConfig("sv8pt5")).toMatchObject({
      rows: 4,
      cols: 4,
      mode: "master",
      mb: false,
      place: "end",
    });
    // other sets unaffected
    expect(loadSetConfig("base1")).toBeNull();
  });

  it("stores compactly (defaults omitted) and survives garbage", () => {
    saveSetConfig({ ...DEFAULT_CONFIG, set: "sv1" });
    expect(localStorage.getItem("bindermon:v1:setconfig:sv1")).toBe("");
    expect(loadSetConfig("sv1")).toMatchObject({ rows: 3, cols: 4, mode: "standard" });

    localStorage.setItem("bindermon:v1:setconfig:sv1", "rows=99&mode=banana");
    expect(loadSetConfig("sv1")).toMatchObject({ rows: 3, mode: "standard" }); // re-validated
  });

  it("ignores configs without a set", () => {
    saveSetConfig({ ...DEFAULT_CONFIG, set: "" });
    expect(localStorage.length).toBe(0);
  });
});

describe("binder recommendation (40-page Vault X zip)", () => {
  it("recommends the size that best fills one binder", () => {
    // PRE master set: 447 slots → 12 PKT (38/40 pages)
    expect(recommendPreset(447)).toMatchObject({ label: "12 PKT", pages: 38, fits: true });
    // base1: 102 slots → 4 PKT (26/40 pages beats 12/40 at 9 PKT)
    expect(recommendPreset(102)).toMatchObject({ label: "4 PKT", pages: 26, fits: true });
  });

  it("falls back to 12 PKT with a binder count when nothing fits", () => {
    const rec = recommendPreset(5000);
    expect(rec.label).toBe("12 PKT");
    expect(rec.fits).toBe(false);
    expect(rec.binders).toBeGreaterThan(1);
  });

  it("evaluates every preset with page and binder math", () => {
    const rows = evaluatePresets(444);
    expect(rows).toHaveLength(4);
    const twelve = rows.find((r) => r.label === "12 PKT")!;
    expect(twelve.pages).toBe(37);
    expect(twelve.binders).toBe(Math.ceil(37 / ZIP_BINDER_PAGES));
  });
});
