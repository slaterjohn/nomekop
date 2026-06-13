// @vitest-environment node
import { describe, it, expect } from "vitest";
import { curatedEnglishSetName, curatedLinksFor } from "@/lib/set-links";

describe("curated set links", () => {
  it("resolves a known Japanese set to its English name", () => {
    expect(curatedEnglishSetName("ja", "SV2a")).toBe("151");
    expect(curatedEnglishSetName("ja", "S12a")).toBe("Crown Zenith");
    // Two Japanese sets bundle into one English set.
    expect(curatedEnglishSetName("ja", "SV4K")).toBe("Paradox Rift");
    expect(curatedEnglishSetName("ja", "SV4M")).toBe("Paradox Rift");
  });

  it("returns undefined for unknown ids and unlisted languages", () => {
    expect(curatedEnglishSetName("ja", "NOPE")).toBeUndefined();
    expect(curatedEnglishSetName("fr", "SV2a")).toBeUndefined(); // Western langs bridge by id
    expect(curatedEnglishSetName("en", "SV2a")).toBeUndefined();
  });

  it("exposes a well-formed link table (non-empty string values)", () => {
    const ja = curatedLinksFor("ja");
    expect(Object.keys(ja).length).toBeGreaterThanOrEqual(20);
    for (const [setId, name] of Object.entries(ja)) {
      expect(setId, "set id").toMatch(/^[A-Za-z0-9.]+$/);
      expect(typeof name).toBe("string");
      expect(name.length, `english name for ${setId}`).toBeGreaterThan(0);
    }
  });

  it("returns an empty object for languages with no curated links", () => {
    expect(curatedLinksFor("de")).toEqual({});
  });
});
