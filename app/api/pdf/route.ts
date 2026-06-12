import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { renderPdf } from "@/lib/pdf";
import { pdfLimiter } from "@/lib/rate-limit";
import { parseConfig, serializeConfig } from "@/lib/config";
import { decodePokemonToken } from "@/lib/pokemon-binder";
import { decodePokedexToken } from "@/lib/pokedex";

const bodySchema = z.object({
  type: z.enum([
    "binder",
    "checklist",
    "placeholders",
    "pokemon",
    "pokemon-placeholders",
    "pokedex",
    "pokedex-placeholders",
  ]),
  config: z.record(z.string(), z.unknown()).optional(),
  token: z.string().max(2000).optional(),
});

/** Maps a validated request to the print route Puppeteer should render. */
function printPathFor(body: z.infer<typeof bodySchema>): { path: string; filename: string } | null {
  const { type, token } = body;
  if (type === "pokemon" || type === "pokemon-placeholders") {
    if (!token || !decodePokemonToken(token)) return null;
    const view = type === "pokemon-placeholders" ? "&view=placeholders" : "";
    return {
      path: `/print/pokemon?t=${encodeURIComponent(token)}${view}`,
      filename: `bindermon-${token.split("~")[0]}-${type}.pdf`,
    };
  }
  if (type === "pokedex" || type === "pokedex-placeholders") {
    if (!token || !decodePokedexToken(token)) return null;
    const view = type === "pokedex-placeholders" ? "&view=placeholders" : "";
    return {
      path: `/print/pokedex?t=${encodeURIComponent(token)}${view}`,
      filename: `bindermon-${token.split("~")[0]}-${type}.pdf`,
    };
  }
  return null; // set-binder types are handled with parsed config below
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  // E2E/CI render many PDFs from one host; the per-IP limiter would 429 them.
  const rateLimited = process.env.DISABLE_PDF_RATE_LIMIT !== "1" && !pdfLimiter.consume(ip);
  if (rateLimited) {
    return NextResponse.json(
      { error: "Easy there, trainer! Too many PDFs at once — try again shortly." },
      { status: 429, headers: { "Retry-After": "10" } },
    );
  }

  let parsedBody: z.infer<typeof bodySchema>;
  try {
    parsedBody = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid PDF request." }, { status: 400 });
  }

  let target: { path: string; filename: string };
  const featureTarget = printPathFor(parsedBody);
  if (featureTarget) {
    target = featureTarget;
  } else if (
    parsedBody.type === "pokemon" ||
    parsedBody.type === "pokemon-placeholders" ||
    parsedBody.type === "pokedex" ||
    parsedBody.type === "pokedex-placeholders"
  ) {
    return NextResponse.json({ error: "Invalid PDF token." }, { status: 400 });
  } else {
    // Re-parse the config leniently (clamps bad values to defaults).
    const config = parseConfig(
      Object.fromEntries(
        Object.entries(parsedBody.config ?? {}).map(([k, v]) => [
          k,
          typeof v === "boolean" ? (v ? "1" : "0") : String(v),
        ]),
      ),
    );
    if (!config.set) {
      return NextResponse.json({ error: "Pick a set before printing." }, { status: 400 });
    }
    const qs = serializeConfig(config).toString();
    target = {
      path: `/print/${parsedBody.type}${qs ? `?${qs}` : ""}`,
      filename: `bindermon-${config.set}-${parsedBody.type}.pdf`,
    };
  }

  try {
    const pdf = await renderPdf(target.path);
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${target.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("pdf render failed:", err);
    return NextResponse.json(
      { error: "PDF generation took too long or failed. Please try again." },
      { status: 504 },
    );
  }
}
