import { NextResponse } from "next/server";
import { getCards } from "@/lib/tcg";
import { toErrorResponse } from "@/lib/api-errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ setId: string }> },
): Promise<NextResponse> {
  const { setId } = await params;
  if (!/^[a-z0-9.]+$/i.test(setId)) {
    return NextResponse.json({ error: "Invalid set id." }, { status: 400 });
  }
  try {
    const cards = await getCards(setId);
    return NextResponse.json(cards, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=86400" },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
