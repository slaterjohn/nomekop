import { NextResponse, type NextRequest } from "next/server";
import { isRefreshRunning, runRefreshAll } from "@/lib/tcg/refresh";

/**
 * Manual trigger for the daily cache walk. Guarded by REFRESH_TOKEN — without
 * one configured the endpoint stays disabled (the in-process scheduler does
 * not need it). Returns 202 immediately; the walk takes minutes.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = process.env.REFRESH_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Refresh endpoint disabled — set REFRESH_TOKEN to enable." },
      { status: 403 },
    );
  }
  const provided = request.headers.get("x-refresh-token");
  if (provided !== token) {
    return NextResponse.json({ error: "Invalid refresh token." }, { status: 403 });
  }
  if (isRefreshRunning()) {
    return NextResponse.json({ error: "Refresh already running." }, { status: 409 });
  }
  void runRefreshAll().catch((err) => console.error("[refresh] failed:", err));
  return NextResponse.json({ started: true }, { status: 202 });
}
