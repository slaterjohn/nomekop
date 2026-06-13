import { NextResponse, type NextRequest } from "next/server";
import { localizedPrintsByDex } from "@/lib/tcg";
import { isLanguage } from "@/lib/tcg/languages";

// Always live — TCGdex lookups depend on the requested dex + languages.
export const dynamic = "force-dynamic";

/**
 * Non-English prints of one Pokémon for the Pokédex swap dialog's lazy,
 * per-pocket fetch:  GET /api/pokedex/prints?dex=6&langs=ja,fr
 * Returns `{ cards }` (TCGdex; no prices). English is never returned here — the
 * page already has every English print.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const params = request.nextUrl.searchParams;
  const dex = Number(params.get("dex"));
  if (!Number.isInteger(dex) || dex < 1 || dex > 1025) {
    return NextResponse.json({ error: "Invalid dex number." }, { status: 400 });
  }

  const langs = (params.get("langs") ?? "")
    .split(",")
    .map((l) => l.trim())
    .filter((l) => l !== "" && l !== "en" && isLanguage(l));
  if (langs.length === 0) return NextResponse.json({ cards: [] });

  const cards = await localizedPrintsByDex(dex, langs).catch(() => []);
  return NextResponse.json(
    { cards },
    { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } },
  );
}
