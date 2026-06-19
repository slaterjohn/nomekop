import { afterEach, describe, expect, it, vi } from "vitest";
import { analyticsEnabled, posthogKey } from "@/lib/analytics/posthog";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("posthogKey / analyticsEnabled", () => {
  it("falls back to the bundled key (analytics on) when the env override is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", undefined as unknown as string);
    expect(posthogKey()).toMatch(/^phc_/);
    expect(analyticsEnabled()).toBe(true);
  });

  it("is disabled when the override is explicitly empty (e.g. e2e/test builds)", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    expect(posthogKey()).toBe("");
    expect(analyticsEnabled()).toBe(false);
  });

  it("uses an explicit override key when provided", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_override_abc");
    expect(posthogKey()).toBe("phc_override_abc");
    expect(analyticsEnabled()).toBe(true);
  });
});
