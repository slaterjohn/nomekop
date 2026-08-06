import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Same pattern as consent-analytics.test.ts: hoist a fake client so the mock
// factory below (which vitest hoists above imports) can close over it.
const ph = vi.hoisted(() => ({
  captureExceptionImmediate: vi.fn(
    async (_error: unknown, _distinctId?: string, _properties?: Record<string, unknown>) => undefined,
  ),
}));
const PostHogCtor = vi.hoisted(() =>
  vi.fn(function PostHog() {
    return ph;
  }),
);
vi.mock("posthog-node", () => ({ PostHog: PostHogCtor }));

import { reportServerError } from "@/lib/analytics/posthog-server";

const request = {
  path: "/sets/base1",
  method: "GET",
  headers: { cookie: "should-never-be-forwarded" },
};

const context = {
  routerKind: "App Router" as const,
  routePath: "/sets/[setId]",
  routeType: "render" as const,
  renderSource: "react-server-components" as const,
  revalidateReason: undefined,
};

describe("reportServerError", () => {
  beforeEach(() => {
    ph.captureExceptionImmediate.mockClear();
    PostHogCtor.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is disabled (no PostHog client, no capture) when the key is empty", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");

    await reportServerError(new Error("boom"), request, context);

    expect(PostHogCtor).not.toHaveBeenCalled();
    expect(ph.captureExceptionImmediate).not.toHaveBeenCalled();
  });

  it("never throws when PostHog itself fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test_key");
    ph.captureExceptionImmediate.mockRejectedValueOnce(new Error("network down"));

    await expect(reportServerError(new Error("boom"), request, context)).resolves.toBeUndefined();
  });

  it("captures the error anonymously with the right request/route context", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test_key");
    const error = Object.assign(new Error("render blew up"), { digest: "abc123" });

    await reportServerError(error, request, context);

    expect(ph.captureExceptionImmediate).toHaveBeenCalledTimes(1);
    const [capturedError, distinctId, properties] = ph.captureExceptionImmediate.mock.calls[0]!;

    expect(capturedError).toBe(error);
    // No distinctId — server-side crash reports stay anonymous (see the consent
    // reasoning in lib/analytics/posthog-server.ts).
    expect(distinctId).toBeUndefined();
    expect(properties).toMatchObject({
      $request_path: "/sets/base1",
      $request_method: "GET",
      router_kind: "App Router",
      route_path: "/sets/[setId]",
      route_type: "render",
      render_source: "react-server-components",
      revalidate_reason: undefined,
      next_error_digest: "abc123",
    });
    // Raw headers (cookies, auth, etc.) must never be forwarded as event properties.
    expect(properties).not.toHaveProperty("headers");
    expect(JSON.stringify(properties)).not.toContain("should-never-be-forwarded");
  });

  it("reuses a single PostHog client across multiple errors instead of reconnecting each time", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test_key");

    await reportServerError(new Error("first"), request, context);
    await reportServerError(new Error("second"), request, context);

    expect(ph.captureExceptionImmediate).toHaveBeenCalledTimes(2);
    expect(PostHogCtor.mock.calls.length).toBeLessThanOrEqual(1);
  });
});
