import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import { getArticle } from "@/lib/content/articles";

/* DMG Game Boy palette — keep in sync with the app-wide theme. */
const INK = "#0f380f";
const ACCENT = "#8bac0f";
const BG = "#9bbc0f";

// The og:image:alt file-convention export is a static string (per-article text
// would need generateImageMetadata); keep it descriptive of the route.
export const alt = "Pokemon TCG fun fact — Nomekop";
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

/** Pokeball motif from nested flex divs (used by both layouts). */
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

/** Site-default look with a subtitle — used whenever the article (or its slug)
 *  can't be resolved. Never throws. */
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

function articleLayout(question: string, description: string) {
  return frame(
    <div
      style={{
        display: "flex",
        flex: 1,
        flexDirection: "column",
        justifyContent: "center",
        gap: 28,
        padding: "44px 56px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        {pokeball(72)}
        <div
          style={{
            display: "flex",
            backgroundColor: INK,
            color: BG,
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 4,
            padding: "8px 18px",
          }}
        >
          FUN FACT
        </div>
      </div>
      <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.08, color: INK }}>
        {question}
      </div>
      <div style={{ fontSize: 30, lineHeight: 1.3, color: INK }}>{description}</div>
    </div>,
  );
}

/** Per-article Open Graph image: a Game Boy "fun fact" card showing the
 *  article's headline question and its answer-first description. An unknown
 *  slug degrades to the site-default layout — sharing a dead URL must still
 *  produce an image, never a 500. */
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const article = getArticle(slug);
    if (!article) throw new Error(`unknown article: ${slug}`);
    return new ImageResponse(articleLayout(article.question, article.description), size);
  } catch {
    return new ImageResponse(fallbackLayout("Fun facts"), size);
  }
}
