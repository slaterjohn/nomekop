import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isCacheCheckRunning, runCacheCheck } from "@/lib/tcg/cache-manager";

/** Constant-time string compare. Both sides are hashed to a fixed length first
 *  so the comparison can't leak the token's length or a character-by-character
 *  match position through timing. */
function constantTimeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Manual trigger for the cache check (plan + queue drain). Guarded by
 * REFRESH_TOKEN — without one configured the endpoint stays disabled (the
 * nightly scheduler does not need it). Returns 202 immediately; a full build
 * takes minutes.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = process.env.REFRESH_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Refresh endpoint disabled — set REFRESH_TOKEN to enable." },
      { status: 403 },
    );
  }
  const provided = request.headers.get("x-refresh-token") ?? "";
  if (!constantTimeEqual(provided, token)) {
    return NextResponse.json({ error: "Invalid refresh token." }, { status: 403 });
  }
  if (isCacheCheckRunning()) {
    return NextResponse.json({ error: "Cache check already running." }, { status: 409 });
  }
  void runCacheCheck().catch((err) => console.error("[cache] check failed:", err));
  return NextResponse.json({ started: true }, { status: 202 });
}
