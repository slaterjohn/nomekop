import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG, parseConfig, serializeConfig } from "@/lib/config";

describe("parseConfig", () => {
  it("applies defaults for an empty query", () => {
    expect(parseConfig({})).toEqual({ ...DEFAULT_CONFIG });
  });

  it("parses a full query", () => {
    expect(
      parseConfig({ set: "sv1", rows: "4", cols: "3", mode: "master", secrets: "0", style: "retro" }),
    ).toEqual({ set: "sv1", rows: 4, cols: 3, mode: "master", secrets: false, style: "retro" });
  });

  it("clamps/recovers invalid values field-by-field", () => {
    const cfg = parseConfig({ set: "base1", rows: "9", cols: "banana", mode: "ultra", secrets: "yes" });
    expect(cfg).toEqual({ ...DEFAULT_CONFIG, set: "base1" });
  });

  it("tolerates array-valued params (takes first)", () => {
    expect(parseConfig({ rows: ["2", "5"], set: ["sv1"] }).rows).toBe(2);
  });
});

describe("serializeConfig", () => {
  it("round-trips a config", () => {
    const cfg = { set: "sv1", rows: 4 as const, cols: 3 as const, mode: "master" as const, secrets: false, style: "retro" as const };
    expect(parseConfig(Object.fromEntries(serializeConfig(cfg)))).toEqual(cfg);
  });

  it("omits defaults to keep URLs tidy", () => {
    const qs = serializeConfig({ ...DEFAULT_CONFIG, set: "base1" });
    expect(qs.get("set")).toBe("base1");
    expect(qs.has("rows")).toBe(false);
    expect(qs.has("mode")).toBe(false);
  });
});
