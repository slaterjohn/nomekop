import { ImageResponse } from "next/og";
import { getFaqSetSummary } from "@/lib/content/faqs/registry";

/* DMG Game Boy palette — keep in sync with the app-wide theme. */
const INK = "#0f380f";
const ACCENT = "#8bac0f";
const BG = "#9bbc0f";

export const alt = "Pokémon TCG set FAQs — Nomekop";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Per-set FAQ hub social image: the set name + answer count in the DMG frame.
 *  Reads the static snapshot (no live API) so it stays hermetic and cacheable. */
export default async function Image({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const set = getFaqSetSummary(setId);
  const title = set ? `${set.fullName} FAQs` : "Pokémon TCG set FAQs";
  const subline = set
    ? `${set.faqCount} answers · card counts · binders · chase cards`
    : "Card counts · binders · rarest cards · chase cards";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", backgroundColor: BG, border: `16px solid ${INK}` }}>
        <div
          style={{
            display: "flex", flex: 1, margin: 10, border: `6px solid ${ACCENT}`,
            flexDirection: "column", alignItems: "flex-start", justifyContent: "center",
            padding: 64, position: "relative",
          }}
        >
          <div style={{ fontSize: 36, color: INK, opacity: 0.8 }}>NOMEKOP · SET FAQS</div>
          <div
            style={{
              display: "flex",
              fontSize: title.length > 28 ? 64 : 84,
              color: INK,
              fontWeight: 700,
              lineHeight: 1.1,
              marginTop: 8,
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 30, color: INK, marginTop: 20 }}>{subline}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
