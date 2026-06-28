import { afterEach, describe, expect, it, vi } from "vitest";

const phCapture = vi.fn();
vi.mock("posthog-js", () => ({ default: { capture: (...a: unknown[]) => phCapture(...a) } }));

import { capture } from "@/lib/analytics/events";

afterEach(() => {
  vi.unstubAllEnvs();
  phCapture.mockReset();
});

describe("capture", () => {
  it("forwards the event name and props to posthog when enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    capture("search_performed", { query: "pika", result_count: 3 });
    expect(phCapture).toHaveBeenCalledWith("search_performed", { query: "pika", result_count: 3 });
  });

  it("is a no-op when analytics is disabled (empty key)", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    capture("search_performed", { query: "pika" });
    expect(phCapture).not.toHaveBeenCalled();
  });

  it("never throws if posthog.capture throws", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    phCapture.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    expect(() => capture("music_toggled", { playing: true })).not.toThrow();
  });
});
