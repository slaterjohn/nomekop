import { NextResponse } from "next/server";
import { getCards } from "@/lib/tcg";
import { toErrorResponse } from "@/lib/api-errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ setId: string }> },
): Promise<NextResponse> {
  const { setId } = await params;
  // 404, not 400: a set id lives in the path, so one that cannot be parsed names
  // no resource — exactly what an unknown-but-well-formed id means (getCards
  // raises unknown-set, which toErrorResponse also maps to 404), and exactly
  // what every page route answers for the same input. This route used to be the
  // one place a crawler got a 400 for a malformed URL. The guard itself stays:
  // it keeps a traversal attempt away from the fixture reader.
  if (!/^[a-z0-9.]+$/i.test(setId)) {
    return NextResponse.json({ error: `No set found with id '${setId}'.` }, { status: 404 });
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
