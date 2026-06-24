import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { turnstileEnforced, verifyTurnstile } from "@/lib/report/turnstile";

const SECRET = "TURNSTILE_SECRET_KEY";
let savedSecret: string | undefined;

beforeEach(() => {
  savedSecret = process.env[SECRET];
  delete process.env[SECRET];
  vi.restoreAllMocks();
});

afterEach(() => {
  if (savedSecret === undefined) delete process.env[SECRET];
  else process.env[SECRET] = savedSecret;
});

function mockFetch(ok: boolean, success: boolean) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ success }), { status: ok ? 200 : 500 }),
  );
}

describe("turnstileEnforced", () => {
  it("is false without a secret, true with one", () => {
    expect(turnstileEnforced()).toBe(false);
    process.env[SECRET] = "x";
    expect(turnstileEnforced()).toBe(true);
  });
});

describe("verifyTurnstile", () => {
  it("passes (skips) when no secret is configured — even with no token", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(await verifyTurnstile("")).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fails an empty token when enforced, without calling siteverify", async () => {
    process.env[SECRET] = "secret";
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(await verifyTurnstile("")).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("passes when siteverify returns success", async () => {
    process.env[SECRET] = "secret";
    mockFetch(true, true);
    expect(await verifyTurnstile("good-token")).toBe(true);
  });

  it("fails when siteverify returns success:false", async () => {
    process.env[SECRET] = "secret";
    mockFetch(true, false);
    expect(await verifyTurnstile("bad-token")).toBe(false);
  });

  it("fails closed on an HTTP error from siteverify", async () => {
    process.env[SECRET] = "secret";
    mockFetch(false, true);
    expect(await verifyTurnstile("token")).toBe(false);
  });

  it("fails closed (no throw) on a network error", async () => {
    process.env[SECRET] = "secret";
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    expect(await verifyTurnstile("token")).toBe(false);
  });
});
