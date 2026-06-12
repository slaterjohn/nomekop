import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { renderPdf } from "@/lib/pdf";
import { pdfLimiter } from "@/lib/rate-limit";
import { parseConfig, serializeConfig } from "@/lib/config";

const bodySchema = z.object({
  type: z.enum(["binder", "checklist", "placeholders"]),
  config: z.record(z.string(), z.unknown()),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!pdfLimiter.consume(ip)) {
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

  // Re-parse the config leniently (clamps bad values to defaults).
  const config = parseConfig(
    Object.fromEntries(
      Object.entries(parsedBody.config).map(([k, v]) => [k, typeof v === "boolean" ? (v ? "1" : "0") : String(v)]),
    ),
  );
  if (!config.set) {
    return NextResponse.json({ error: "Pick a set before printing." }, { status: 400 });
  }

  try {
    const qs = serializeConfig(config).toString();
    const pdf = await renderPdf(`/print/${parsedBody.type}${qs ? `?${qs}` : ""}`);
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bindermon-${config.set}-${parsedBody.type}.pdf"`,
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
