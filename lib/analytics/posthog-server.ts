import { PostHog } from "posthog-node";
import { analyticsEnabled, posthogKey, POSTHOG_SERVER_HOST } from "@/lib/analytics/posthog";

// Server-side half of PostHog Error Tracking. Wired up from instrumentation.ts's
// `onRequestError` hook (Node runtime only — see the guard there), this closes the
// gap left by the client-only setup in instrumentation-client.ts / global-error.tsx:
// those only see errors that survive to the browser, so a Server Component render
// failure previously showed up in PostHog as a stack-free "An error occurred in the
// Server Components render... message is omitted in production builds" issue with
// nothing to act on. Reporting from here, before Next strips the message for the
// client, gets the real error and the request context it failed under.
//
// CONSENT: the browser client is opt-out-by-default (posthog.init in
// instrumentation-client.ts) — nothing is captured there until the cookie-consent
// banner is accepted. That gate is for *behavioural* tracking: pageviews, clicks,
// session data tied to a specific visitor. A server crash report is a different kind
// of event — operational telemetry about the app failing, not about what a visitor
// did — and this code has no reliable way to read browser consent state anyway (no
// cookies here, and a render failure can happen before any consent cookie exists).
//
// So this reports ANONYMOUSLY, on purpose. posthog-node's captureException accepts an
// optional distinctId, and it would be tempting to pass the browser client's
// `distinct_id` (e.g. read from a cookie on the incoming request) so errors show up
// against a person. Deliberately not doing that: attaching a persistent distinct_id
// here would let *server* code identify a visitor and attach data to their PostHog
// profile regardless of whether they ever accepted the consent banner — silently
// working around the GDPR gate the banner exists to enforce. Leaving distinctId
// unset makes posthog-node generate a fresh random id per event and mark it
// `$process_person_profile: false` internally, so these events never merge into any
// person profile. We lose "which visitor hit this", but that's the correct trade —
// this is a crash log, not a tracking pixel. If we ever need to correlate a specific
// report with a support ticket, Next's own `error.digest` (forwarded below) already
// gives us that without touching identity.
//
// Request headers are deliberately NOT forwarded as event properties — they can
// carry cookies, auth tokens, etc. Only structured, low-cardinality context goes to
// PostHog (path, method, router/route info).

let client: PostHog | null | undefined;

/**
 * Lazily creates (and reuses) the server-side PostHog client for the life of the
 * process. Re-checks `analyticsEnabled()` on every call rather than deciding once at
 * module load, so an empty `NEXT_PUBLIC_POSTHOG_KEY` (e2e/test builds, per
 * lib/analytics/posthog.ts) reliably disables server capture too, and so tests that
 * stub the env var see the right behaviour without needing to reload the module.
 */
function getClient(): PostHog | null {
  if (!analyticsEnabled()) return null;
  if (!client) {
    client = new PostHog(posthogKey(), { host: POSTHOG_SERVER_HOST });
  }
  return client;
}

/**
 * Reports a server-side request error (from instrumentation.ts's `onRequestError`)
 * to PostHog Error Tracking. Never throws — analytics is best-effort, exactly like
 * the client-side init (instrumentation-client.ts) and global-error.tsx, and it must
 * never compound a request that's already failing.
 *
 * Uses `captureExceptionImmediate` rather than `captureException` deliberately:
 * posthog-node batches and periodically flushes on a queue, but `captureException`'s
 * event build is async and neither `flush()` nor shutdown reliably wait for it (a
 * known upstream gap — PostHog/posthog-js#2220) — so a process that exits quickly
 * after a crash (a serverless invocation, a container getting recycled) can silently
 * drop the very exception being reported. `captureExceptionImmediate` sends the
 * event directly and is awaited here, so by the time this function returns the HTTP
 * call has already completed (or failed) — nothing is left sitting in a queue for a
 * shutdown hook to lose, and there is nothing further to flush.
 */
export async function reportServerError(
  error: unknown,
  request: Readonly<{
    path: string;
    method: string;
    headers: NodeJS.Dict<string | string[]>;
  }>,
  context: Readonly<{
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: "render" | "route" | "action" | "proxy";
    renderSource?: "react-server-components" | "react-server-components-payload" | "server-rendering";
    revalidateReason: "on-demand" | "stale" | undefined;
  }>,
): Promise<void> {
  const posthog = getClient();
  if (!posthog) return;

  try {
    const digest = (error as { digest?: string } | null | undefined)?.digest;
    await posthog.captureExceptionImmediate(error, undefined, {
      $request_path: request.path,
      $request_method: request.method,
      router_kind: context.routerKind,
      route_path: context.routePath,
      route_type: context.routeType,
      render_source: context.renderSource,
      revalidate_reason: context.revalidateReason,
      // Next's own error-correlation ID — lets us match this PostHog event back to
      // the (still stack-free) digest that shows up in server logs / the rendered
      // error page, without carrying any user identity.
      next_error_digest: digest,
    });
  } catch {
    // Best-effort — never let error reporting throw on top of the original error.
  }
}
