import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import { getCards, getSets } from "@/lib/tcg";
import type { TcgCard, TcgSet } from "@/lib/tcg/types";

/* DMG Game Boy palette — keep in sync with the app-wide theme. */
const INK = "#0f380f";
const ACCENT = "#8bac0f";
const BG = "#9bbc0f";

// The og:image:alt file-convention export is a static string (per-card text
// would need generateImageMetadata); keep it descriptive of the route.
export const alt = "Pokemon TCG card — Bindermon";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Shared DMG frame: green screen, chunky ink border, accent inner border and
 *  a small BINDERMON wordmark pinned bottom-right. */
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
          BINDERMON
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

/** Site-default look with the card id as subtitle — used whenever card data
 *  (or the id itself) can't be resolved. Never throws. */
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
        BINDERMON
      </div>
      <div style={{ fontSize: 30, letterSpacing: 2, color: INK }}>{subtitle}</div>
    </div>,
  );
}

/** TCGplayer market price across the print variants we care about. */
function marketPrice(card: TcgCard): number | undefined {
  const prices = card.tcgplayer?.prices;
  return (
    prices?.normal?.market ?? prices?.holofoil?.market ?? prices?.reverseHolofoil?.market
  );
}

function cardLayout(card: TcgCard, set: TcgSet) {
  const scan = card.imageLarge || card.imageSmall;
  const market = marketPrice(card);
  const collectorLine = `${card.number}/${set.printedTotal}${card.rarity ? ` · ${card.rarity}` : ""}`;
  return frame(
    <div
      style={{
        display: "flex",
        flex: 1,
        alignItems: "center",
        gap: 52,
        padding: "30px 48px",
      }}
    >
      {scan ? (
        <img
          src={scan}
          alt=""
          style={{
            width: 374,
            height: 520,
            objectFit: "contain",
            border: `8px solid ${INK}`,
            backgroundColor: ACCENT,
          }}
        />
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 22 }}>
        <div style={{ fontSize: 62, fontWeight: 800, lineHeight: 1.05, color: INK }}>
          {card.name}
        </div>
        <div style={{ fontSize: 34, color: INK }}>{collectorLine}</div>
        <div style={{ fontSize: 28, color: INK }}>
          {`${set.name} — ${set.series} series`}
        </div>
        {typeof market === "number" ? (
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              backgroundColor: INK,
              color: BG,
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: 3,
              padding: "12px 24px",
              marginTop: 6,
            }}
          >
            {`MARKET $${market.toFixed(2)}`}
          </div>
        ) : null}
      </div>
    </div>,
  );
}

/** Per-card Open Graph image: scan on the left (when the card has one),
 *  name / collector number / set / market price on the right. Any data
 *  failure degrades to the site-default layout — sharing a dead card URL
 *  must still produce an image, never a 500. */
export default async function Image({
  params,
}: {
  params: Promise<{ cardId: string }>;
}) {
  const { cardId } = await params;
  try {
    // cardId is `<setId>-<number>`; set ids can contain dashes in principle,
    // card numbers cannot — so split on the LAST dash.
    const dash = cardId.lastIndexOf("-");
    if (dash <= 0) throw new Error(`malformed card id: ${cardId}`);
    const setId = cardId.slice(0, dash);
    const [sets, cards] = await Promise.all([getSets(), getCards(setId)]);
    const set = sets.find((entry) => entry.id === setId);
    const card = cards.find((entry) => entry.id === cardId);
    if (!set || !card) throw new Error(`unknown card: ${cardId}`);
    return new ImageResponse(cardLayout(card, set), size);
  } catch {
    return new ImageResponse(fallbackLayout(cardId), size);
  }
}
