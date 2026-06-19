"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { analyticsEnabled } from "@/lib/analytics/posthog";

// Catch-all error boundary for otherwise-fatal render errors (there is no other
// error.tsx in the tree). Two jobs: (1) report the error to PostHog Error
// Tracking — React swallows render errors before they reach window.onerror, so
// `capture_exceptions` alone wouldn't see them; (2) show a minimal on-brand
// fallback instead of a blank screen. global-error replaces the root layout, so
// it must render its own <html>/<body> and can't rely on the app's fonts/theme.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    if (analyticsEnabled()) {
      try {
        posthog.captureException(error);
      } catch {
        // best-effort — never let reporting throw on top of the original error
      }
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.25rem",
          background: "#9bbc0f",
          color: "#0f380f",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>SOMETHING BROKE</h1>
        <p style={{ margin: 0, maxWidth: "32rem" }}>
          A wild error appeared. It&apos;s been logged — try again.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            border: "4px solid #0f380f",
            background: "#8bac0f",
            color: "#0f380f",
            font: "inherit",
            padding: "0.75rem 1.5rem",
            cursor: "pointer",
            boxShadow: "5px 5px 0 0 #0f380f",
          }}
        >
          RELOAD
        </button>
      </body>
    </html>
  );
}
