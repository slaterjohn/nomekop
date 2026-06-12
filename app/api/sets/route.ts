import { NextResponse } from "next/server";
import { getSets } from "@/lib/tcg";
import { toErrorResponse } from "@/lib/api-errors";

export async function GET(): Promise<NextResponse> {
  try {
    const sets = await getSets();
    return NextResponse.json(sets, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=86400" },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
