import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock("posthog-js", () => ({ default: { capture } }));

import {
  installConsoleCapture,
  __resetConsoleCaptureForTests,
} from "@/lib/analytics/console-capture";

describe("installConsoleCapture", () => {
  let original: { error: typeof console.error; warn: typeof console.warn };

  beforeEach(() => {
    capture.mockClear();
    __resetConsoleCaptureForTests();
    original = { error: console.error, warn: console.warn };
  });

  afterEach(() => {
    console.error = original.error;
    console.warn = original.warn;
  });

  it("forwards console.error to PostHog as a $console_log event and preserves the original", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    installConsoleCapture();

    console.error("boom", 42);

    expect(spy).toHaveBeenCalledWith("boom", 42); // native behaviour preserved
    expect(capture).toHaveBeenCalledWith("$console_log", { level: "error", message: "boom 42" });
  });

  it("forwards console.warn with the right level", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    installConsoleCapture();

    console.warn("careful");

    expect(capture).toHaveBeenCalledWith("$console_log", { level: "warn", message: "careful" });
  });

  it("does not capture PostHog's own logs (no feedback loop)", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    installConsoleCapture();

    console.error("[PostHog.js] something internal");

    expect(capture).not.toHaveBeenCalled();
  });
});
