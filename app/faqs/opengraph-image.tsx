import { ImageResponse } from "next/og";

const INK = "#0f380f";
const ACCENT = "#8bac0f";
const BG = "#9bbc0f";

export const alt = "Pokémon TCG set FAQs — Nomekop";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
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
          <div style={{ fontSize: 40, color: INK, opacity: 0.8 }}>NOMEKOP</div>
          <div style={{ fontSize: 84, color: INK, fontWeight: 700, lineHeight: 1.1 }}>
            Pokémon TCG{"\n"}set FAQs
          </div>
          <div style={{ fontSize: 32, color: INK, marginTop: 16 }}>
            Card counts · binders · rarest cards · chase cards
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
