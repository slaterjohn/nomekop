import { describe, it, expect } from "vitest";
import { decodeShareToken, encodeShareToken } from "@/lib/share";
import { DEFAULT_CONFIG, type BinderConfig } from "@/lib/config";

describe("share tokens", () => {
  it("encodes a tidy, readable token", () => {
    const config: BinderConfig = {
      ...DEFAULT_CONFIG,
      set: "sv8pt5",
      rows: 3,
      cols: 4,
      mode: "master",
    };
    expect(encodeShareToken(config)).toBe("sv8pt5~34m1111ic");
  });

  it("round-trips every field", () => {
    const config: BinderConfig = {
      set: "zsv10pt5",
      rows: 4,
      cols: 5,
      mode: "master",
      secrets: false,
      pb: true,
      mb: false,
      ep: false,
      place: "end",
      style: "retro",
    };
    expect(decodeShareToken(encodeShareToken(config))).toEqual(config);
  });

  it("decodes a legacy token (no Energy bit) with Energy patterns on", () => {
    expect(decodeShareToken("sv8pt5~34m111ic")).toMatchObject({ ep: true, pb: true, mb: true });
  });

  it("round-trips the defaults", () => {
    const config: BinderConfig = { ...DEFAULT_CONFIG, set: "base1" };
    expect(decodeShareToken(encodeShareToken(config))).toEqual(config);
  });

  it("rejects malformed tokens", () => {
    for (const bad of ["", "nonsense", "sv1~99m111ic", "sv1~34x111ic", "sv1~34m111icEXTRA", "../etc~34m111ic"]) {
      expect(decodeShareToken(bad), bad).toBeNull();
    }
  });
});
