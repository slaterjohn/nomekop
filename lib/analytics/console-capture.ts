import posthog from "posthog-js";

// Forward console.error / console.warn to PostHog as `$console_log` events, so app
// logs show up alongside the analytics. (We don't use session replay, which is the
// usual home for console capture, so this is the standalone equivalent.)
//
// Best-effort by design: it preserves native console behaviour, skips PostHog's own
// "[PostHog.js]" logs to avoid a feedback loop, truncates long messages, and never
// throws. It respects consent for free — posthog.capture is a no-op while the user
// is opted out (the default until they accept the banner).

let installed = false;

function safeStringify(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

export function installConsoleCapture(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  (["error", "warn"] as const).forEach((level) => {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      original(...args);
      try {
        const message = args.map(safeStringify).join(" ").slice(0, 1000);
        // Don't capture PostHog's own console output — it would feed back on itself.
        if (message.startsWith("[PostHog.js]")) return;
        posthog.capture("$console_log", { level, message });
      } catch {
        // logging must never break the app
      }
    };
  });
}

/** Test-only: undo the install flag so the wrapper can be re-installed. */
export function __resetConsoleCaptureForTests(): void {
  installed = false;
}
