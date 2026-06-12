import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import { getCards, getSets } from "@/lib/tcg";
import type { TcgSet } from "@/lib/tcg/types";

/* DMG Game Boy palette — keep in sync with the app-wide theme. */
const INK = "#0f380f";
const ACCENT = "#8bac0f";
const BG = "#9bbc0f";

// The og:image:alt file-convention export is a static string (per-set text
// would need generateImageMetadata); keep it descriptive of the route.
export const alt = "Pokemon TCG set — card list & binder layouts";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Shared DMG frame: green screen, chunky ink border, accent inner border and
 *  a small NOMEKOP wordmark pinned bottom-right. */
function frame(children: ReactNode) {
  return (
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
          position: "relative",
        }}
      >
        {children}
        <div
          style={{
            position: "absolute",
            right: 26,
            bottom: 20,
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: 6,
            color: INK,
          }}
        >
          NOMEKOP
        </div>
      </div>
    </div>
  );
}

/** Pokeball motif from nested flex divs (used by the fallback layout). */
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

/** Site-default look with the set id as subtitle — used whenever the set
 *  itself can't be resolved. Never throws. */
function fallbackLayout(subtitle: string) {
  return frame(
    <div
      style={{
        display: "flex",
        flex: 1,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
      }}
    >
      {pokeball(150)}
      <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: 12, color: INK }}>
        NOMEKOP
      </div>
      <div style={{ fontSize: 30, letterSpacing: 2, color: INK }}>{subtitle}</div>
    </div>,
  );
}

function setLayout(set: TcgSet, scans: string[]) {
  const year = set.releaseDate.slice(0, 4);
  const metaLine = `${set.printedTotal} cards · ${set.series} · ${year}`;
  return frame(
    <div
      style={{
        display: "flex",
        flex: 1,
        alignItems: "center",
        gap: 56,
        padding: "30px 48px",
      }}
    >
      {scans.length > 0 ? (
        <div style={{ display: "flex", alignItems: "center" }}>
          {scans.map((src, index) => (
            <img
              key={src}
              src={src}
              alt=""
              style={{
                width: 208,
                height: 290,
                objectFit: "contain",
                border: `6px solid ${INK}`,
                backgroundColor: ACCENT,
                transform: `rotate(${(index - 1) * 9}deg)`,
                marginLeft: index === 0 ? 0 : -44,
              }}
            />
          ))}
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 22 }}>
        <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05, color: INK }}>
          {set.name}
        </div>
        <div style={{ fontSize: 34, color: INK }}>{metaLine}</div>
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            backgroundColor: INK,
            color: BG,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 3,
            padding: "12px 24px",
            marginTop: 8,
          }}
        >
          {"BINDER LAYOUTS & CHECKLISTS"}
        </div>
      </div>
    </div>,
  );
}

/** Per-set Open Graph image: up to three card scans fanned on the left (only
 *  when card data is cheaply available — failures degrade to text-only), set
 *  facts and the strapline on the right. An unknown set id degrades further
 *  to the site-default layout — never a 500. */
export default async function Image({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  try {
    const sets = await getSets();
    const set = sets.find((entry) => entry.id === setId);
    if (!set) throw new Error(`unknown set: ${setId}`);

    let scans: string[] = [];
    try {
      const cards = await getCards(setId);
      scans = cards
        .filter((card) => card.imageSmall)
        .slice(0, 3)
        .map((card) => card.imageSmall);
    } catch {
      // Card data unavailable — render the text-only variant.
    }
    return new ImageResponse(setLayout(set, scans), size);
  } catch {
    return new ImageResponse(fallbackLayout(setId), size);
  }
}
