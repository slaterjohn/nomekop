// @vitest-environment node
import { describe, it, expect, afterEach, vi } from "vitest";

// Keep the success path side-effect-free (don't kick off a real cache walk).
vi.mock("@/lib/tcg/cache-manager", () => ({
  isCacheCheckRunning: () => false,
  runCacheCheck: vi.fn(async () => {}),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/refresh/route";

afterEach(() => vi.unstubAllEnvs());

function post(token?: string): NextRequest {
  return new NextRequest("http://test/api/refresh", {
    method: "POST",
    headers: token === undefined ? {} : { "x-refresh-token": token },
  });
}

describe("POST /api/refresh auth", () => {
  it("stays disabled (403) when REFRESH_TOKEN is unset", async () => {
    vi.stubEnv("REFRESH_TOKEN", "");
    expect((await POST(post("anything"))).status).toBe(403);
  });

  it("rejects a missing or wrong token (403)", async () => {
    vi.stubEnv("REFRESH_TOKEN", "correct-horse-battery-staple");
    expect((await POST(post(undefined))).status).toBe(403);
    expect((await POST(post("wrong"))).status).toBe(403);
    // A wrong token of the same length must also be rejected (constant-time path).
    expect((await POST(post("correct-horse-battery-stapleX".slice(0, 27)))).status).toBe(403);
  });

  it("accepts the correct token (202)", async () => {
    vi.stubEnv("REFRESH_TOKEN", "correct-horse-battery-staple");
    expect((await POST(post("correct-horse-battery-staple"))).status).toBe(202);
  });
});
