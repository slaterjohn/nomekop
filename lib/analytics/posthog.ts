// PostHog web + product analytics — shared config and the enable guard.
//
// The project API key below is PostHog's PUBLIC client key (the `phc_…` one that
// ships in the browser bundle anyway), so it's safe to commit. It's the default;
// override it per-environment with NEXT_PUBLIC_POSTHOG_KEY (build-time inlined,
// like the other NEXT_PUBLIC_* flags — see lib/features.ts). Setting that env to
// an empty string disables analytics entirely (no init, no banner, no network) —
// handy for e2e/test builds.
//
// Events are sent same-origin to `/ingest` and reverse-proxied to PostHog in
// next.config.ts, so the strict CSP (`connect-src 'self'`) needs no change and
// ad-blockers don't drop events. Nothing is captured until the user accepts the
// cookie-consent banner (PostHog is initialized opt-out-by-default).

/** PostHog's public project key. EU project. Override via NEXT_PUBLIC_POSTHOG_KEY. */
const DEFAULT_POSTHOG_KEY = "phc_u386Jc7LRTtwFEFxEpk68B4YnzhkvFYTYxEWmu4hQayC";

/** Same-origin path that next.config.ts rewrites to the PostHog ingestion host. */
export const POSTHOG_API_HOST = "/ingest";

/**
 * Region UI host — for the PostHog toolbar and "view in PostHog" links. EU to
 * match the project; change it together with the proxy target in next.config.ts
 * if the project ever moves to US (https://us.posthog.com).
 */
export const POSTHOG_UI_HOST = "https://eu.posthog.com";

/**
 * Direct EU ingestion host for server-side capture (posthog-node, see
 * lib/analytics/posthog-server.ts). Unlike the browser client, the server talks to
 * PostHog directly instead of going through the `/ingest` rewrite in next.config.ts —
 * that rewrite exists purely to keep the strict browser CSP (`connect-src 'self'`)
 * happy and to dodge ad-blockers, neither of which applies to a server-to-server call.
 * Keep this in sync with the rewrite's destination if the project ever moves off EU.
 */
export const POSTHOG_SERVER_HOST = "https://eu.i.posthog.com";

/**
 * The active key: the env override when set (including "" to disable), else the
 * bundled default. Read live (not a module constant) so it stays correct under
 * test env stubbing; in the browser bundle the reference is inlined anyway.
 */
export function posthogKey(): string {
  const override = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  return override === undefined ? DEFAULT_POSTHOG_KEY : override;
}

/** Analytics is wired up only when a (non-empty) key is configured. */
export function analyticsEnabled(): boolean {
  return posthogKey().length > 0;
}
