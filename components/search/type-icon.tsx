import type { SearchType } from "@/lib/search/types";

// Pixel glyphs per result type (currentColor, crisp on the grid) — Pokémon ball,
// stacked cards, paintbrush, a "?" for FAQs, a sparkle for facts.
const PATHS: Record<SearchType, string> = {
  pokemon:
    '<path d="M8 3h8v2H8zM5 5h3v2H5zm11 0h3v2h-3zM3 7h2v3H3zm16 0h2v3h-2zM3 14h2v3H3zm16 0h2v3h-2zM5 17h3v2H5zm11 0h3v2h-3zM8 19h8v2H8z"/><path d="M3 11h6v2H3zm12 0h6v2h-6z"/><path d="M10 9h4v6h-4z"/>',
  set: '<path d="M7 3h13v2H7zM5 5h2v10H5zm15 0h2v10h-2zM7 15h13v2H7z"/><path d="M3 8h2v11h13v2H3z"/>',
  artist:
    '<path d="M14 2h6v6h-2v2h-2V8h-2zM12 6h2v2h-2zm-2 2h2v2h-2zm-2 2h2v2H8zm-2 2h2v2H6zm-2 2h2v4H2v-2h2z"/>',
  faq: '<path d="M8 3h8v2H8zM6 5h2v2H6zm10 0h2v5h-2zM13 10h2v2h-2zm-2 2h2v3h-2zm0 5h2v2h-2z"/>',
  fact: '<path d="M11 2h2v6h-2zM11 16h2v6h-2zM2 11h6v2H2zm14 0h6v2h-6zM5 5h2v2H5zm12 0h2v2h-2zM5 17h2v2H5zm12 0h2v2h-2z"/>',
};

/** A 1em pixel icon for a search result type. */
export function TypeIcon({ type }: { type: SearchType }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="currentColor"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="inline-block shrink-0"
      dangerouslySetInnerHTML={{ __html: PATHS[type] }}
    />
  );
}
