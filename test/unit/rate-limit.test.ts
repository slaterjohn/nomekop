import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TokenBucketLimiter } from "@/lib/rate-limit";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-06-11T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("TokenBucketLimiter", () => {
  it("allows a burst up to capacity then refuses", () => {
    const limiter = new TokenBucketLimiter(3, 10_000);
    expect(limiter.consume("a")).toBe(true);
    expect(limiter.consume("a")).toBe(true);
    expect(limiter.consume("a")).toBe(true);
    expect(limiter.consume("a")).toBe(false);
  });

  it("refills one token per interval", () => {
    const limiter = new TokenBucketLimiter(2, 10_000);
    limiter.consume("a");
    limiter.consume("a");
    expect(limiter.consume("a")).toBe(false);
    vi.advanceTimersByTime(10_000);
    expect(limiter.consume("a")).toBe(true);
    expect(limiter.consume("a")).toBe(false);
    vi.advanceTimersByTime(25_000); // 2 intervals → capped at capacity 2
    expect(limiter.consume("a")).toBe(true);
    expect(limiter.consume("a")).toBe(true);
    expect(limiter.consume("a")).toBe(false);
  });

  it("isolates keys", () => {
    const limiter = new TokenBucketLimiter(1, 10_000);
    expect(limiter.consume("a")).toBe(true);
    expect(limiter.consume("a")).toBe(false);
    expect(limiter.consume("b")).toBe(true);
  });
});
