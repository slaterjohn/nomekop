import type { Instrumentation } from "next";

/**
 * Next.js server-boot hook: starts the nightly TCG cache manager.
 * (next dev / next start, Node runtime only.)
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { scheduleNightlyRefresh } = await import("@/lib/tcg/cache-manager");
    scheduleNightlyRefresh();
  }
}

/**
 * Next.js server-error hook: reports uncaught server-side errors (Server Component
 * render failures, Route Handler/Server Action throws) to PostHog Error Tracking.
 * This is the server-side half of error tracking — instrumentation-client.ts and
 * app/global-error.tsx already cover client-side/render errors that reach the
 * browser, but without this, a Server Components render failure only ever reaches
 * PostHog as a stack-free digest-only issue (Next strips the real message/stack
 * before it reaches the client in production). See lib/analytics/posthog-server.ts
 * for the actual reporting logic, the consent reasoning, and why it's safe to call
 * unconditionally (it no-ops when analytics is disabled and never throws).
 *
 * Node runtime only, same as the cache-manager import above — `onRequestError` also
 * fires on the Edge runtime (middleware, Edge routes), but posthog-node needs Node
 * APIs it doesn't have there. Edge request errors are NOT reported by this hook; if
 * Edge coverage is ever needed it requires a separate edge-compatible client (e.g.
 * posthog-js's stateless capture, or a raw `fetch` to the ingestion endpoint).
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { reportServerError } = await import("@/lib/analytics/posthog-server");
      await reportServerError(error, request, context);
    } catch {
      // Analytics is best-effort — never let error reporting throw on top of
      // the original error Next.js is already handling.
    }
  }
};
