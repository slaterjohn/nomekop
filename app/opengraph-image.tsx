import { ImageResponse } from "next/og";

/* DMG Game Boy palette — keep in sync with the app-wide theme. */
const INK = "#0f380f";
const ACCENT = "#8bac0f";
const BG = "#9bbc0f";

export const alt = "Bindermon — Pokemon TCG binder layout maker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Pokeball motif from nested flex divs: ink ring, two hemispheres split by a
 *  hinge band, and a centre button. borderRadius 9999 + overflow hidden keeps
 *  the hemisphere fills inside the circle. */
function pokeball(diameter: number) {
  const ring = Math.round(diameter / 16);
  const button = Math.round(diameter / 3.8);
  const offset = Math.round((diameter - ring * 2 - button) / 2);
  return (
    <div
      style={{
        width: diameter,
        height: diameter,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        borderRadius: 9999,
        border: `${ring}px solid ${INK}`,
        backgroundColor: BG,
      }}
    >
      <div style={{ display: "flex", flex: 1, backgroundColor: ACCENT }} />
      <div style={{ display: "flex", height: ring, backgroundColor: INK }} />
      <div style={{ display: "flex", flex: 1, backgroundColor: BG }} />
      <div
        style={{
          position: "absolute",
          left: offset,
          top: offset,
          width: button,
          height: button,
          borderRadius: 9999,
          border: `${Math.max(4, Math.round(ring * 0.8))}px solid ${INK}`,
          backgroundColor: BG,
        }}
      />
    </div>
  );
}

/** Site-default Open Graph card: DMG-green screen in a chunky ink frame with
 *  an accent inner border — Game Boy look via palette + borders (pixel fonts
 *  aren't available to satori, so system text does the talking). */
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: BG,
          border: `16px solid ${INK}`,
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            margin: 10,
            border: `6px solid ${ACCENT}`,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 30,
          }}
        >
          {pokeball(170)}
          <div
            style={{
              fontSize: 110,
              fontWeight: 800,
              letterSpacing: 14,
              color: INK,
            }}
          >
            BINDERMON
          </div>
          <div style={{ fontSize: 30, letterSpacing: 2, color: INK }}>
            Pokemon TCG binder layouts, checklists &amp; printables
          </div>
        </div>
      </div>
    ),
    size,
  );
}
