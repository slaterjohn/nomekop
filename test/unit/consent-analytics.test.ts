import { describe, it, expect, vi, beforeEach } from "vitest";

const ph = vi.hoisted(() => ({
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  capture: vi.fn(),
  get_explicit_consent_status: vi.fn(() => "pending"),
}));
vi.mock("posthog-js", () => ({ default: ph }));

import { grantConsent, denyConsent } from "@/lib/analytics/consent";

beforeEach(() => {
  ph.capture.mockClear();
  ph.opt_in_capturing.mockClear();
  ph.opt_out_capturing.mockClear();
});

describe("consent analytics", () => {
  it("grantConsent opts in and emits consent_set granted with the surface", () => {
    grantConsent("settings");
    expect(ph.opt_in_capturing).toHaveBeenCalled();
    expect(ph.capture).toHaveBeenCalledWith("consent_set", { decision: "granted", surface: "settings" });
  });

  it("grantConsent defaults the surface to banner", () => {
    grantConsent();
    expect(ph.capture).toHaveBeenCalledWith("consent_set", { decision: "granted", surface: "banner" });
  });

  it("denyConsent stays silent (no consent_set transmitted)", () => {
    denyConsent();
    expect(ph.opt_out_capturing).toHaveBeenCalled();
    expect(ph.capture).not.toHaveBeenCalledWith(
      "consent_set",
      expect.objectContaining({ decision: "denied" }),
    );
  });
});
