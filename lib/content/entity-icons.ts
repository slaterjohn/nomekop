// Shared definitions for typed entity links (Pokémon / artist / set / card).
// Used by both the React link components (components/entities/entity-link.tsx)
// and the Markdown renderer (lib/content/render.ts), so prose links and
// component links look identical. Icons are inline pixel SVGs inheriting the
// active palette via currentColor — theme-safe across every Game Boy skin.

export type EntityType = "pokemon" | "artist" | "set" | "card";

// Distinct, non-dotted underline per type (the user asked to avoid dotted):
// Pokémon solid, set thick-solid, artist double, card wavy. All inherit colour.
export const ENTITY_LINK_CLASS: Record<EntityType, string> = {
  pokemon: "underline underline-offset-2 decoration-2 decoration-solid",
  set: "underline underline-offset-2 decoration-4 decoration-solid",
  artist: "underline underline-offset-2 decoration-2 decoration-double",
  card: "underline underline-offset-2 decoration-2 decoration-wavy",
};

const SVG_OPEN =
  '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" ' +
  'shape-rendering="crispEdges" aria-hidden="true" ' +
  'style="display:inline-block;vertical-align:-0.125em;margin-right:0.15em">';

// Pixel-art glyphs (paths only; wrapped by SVG_OPEN/`</svg>`).
const PATHS: Record<EntityType, string> = {
  // Poké Ball: ring + centre band + button.
  pokemon:
    '<path d="M8 3h8v2H8zM5 5h3v2H5zm11 0h3v2h-3zM3 7h2v3H3zm16 0h2v3h-2zM3 14h2v3H3zm16 0h2v3h-2zM5 17h3v2H5zm11 0h3v2h-3zM8 19h8v2H8z"/><path d="M3 11h6v2H3zm12 0h6v2h-6z"/><path d="M10 9h4v6h-4z"/>',
  // Paintbrush.
  artist:
    '<path d="M14 2h6v6h-2v2h-2V8h-2zM12 6h2v2h-2zm-2 2h2v2h-2zm-2 2h2v2H8zm-2 2h2v2H6zm-2 2h2v4H2v-2h2z"/>',
  // Two stacked cards.
  set: '<path d="M7 3h13v2H7zM5 5h2v10H5zm15 0h2v10h-2zM7 15h13v2H7z"/><path d="M3 8h2v11h13v2H3z"/>',
  // A single card.
  card: '<path d="M5 3h14v2H5zm0 16h14v2H5zM3 5h2v14H3zm16 0h2v14h-2z"/><path d="M7 8h10v2H7zm0 4h7v2H7z"/>',
};

/** Inline SVG markup for an entity type. */
export function entityIconSvg(type: EntityType): string {
  return `${SVG_OPEN}${PATHS[type]}</svg>`;
}

/** The entity type an internal href points at, or null for everything else. */
export function entityTypeForHref(href: string): EntityType | null {
  if (href.startsWith("/pokemon/")) return "pokemon";
  if (href.startsWith("/illustrator/")) return "artist";
  if (href.startsWith("/set/")) return "set";
  if (href.startsWith("/card/")) return "card";
  return null;
}
