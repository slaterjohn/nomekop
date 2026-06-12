import Link from "next/link";

type Tile = {
  href: string;
  title: string;
  blurb: string;
  cta: string;
  art: React.ReactNode;
};

/* Pixel art drawn with hard-edged SVG rects — same DMG palette, no images. */

function BinderArt() {
  return (
    <svg viewBox="0 0 48 48" shapeRendering="crispEdges" aria-hidden="true" className="h-16 w-16">
      <rect x="6" y="6" width="36" height="36" fill="var(--gb-accent)" stroke="var(--gb-ink)" strokeWidth="2" />
      <rect x="10" y="10" width="12" height="12" fill="var(--gb-bg)" stroke="var(--gb-ink)" strokeWidth="2" />
      <rect x="26" y="10" width="12" height="12" fill="var(--gb-bg)" stroke="var(--gb-ink)" strokeWidth="2" />
      <rect x="10" y="26" width="12" height="12" fill="var(--gb-bg)" stroke="var(--gb-ink)" strokeWidth="2" />
      <rect x="26" y="26" width="12" height="12" fill="var(--gb-bg)" stroke="var(--gb-ink)" strokeWidth="2" />
      <rect x="4" y="6" width="4" height="36" fill="var(--gb-ink)" />
    </svg>
  );
}

function PokeballArt() {
  return (
    <svg viewBox="0 0 48 48" shapeRendering="crispEdges" aria-hidden="true" className="h-16 w-16">
      <circle cx="24" cy="24" r="18" fill="var(--gb-bg)" stroke="var(--gb-ink)" strokeWidth="3" />
      <path d="M6 24a18 18 0 0136 0z" fill="var(--gb-accent)" />
      <rect x="6" y="22" width="36" height="4" fill="var(--gb-ink)" />
      <circle cx="24" cy="24" r="6" fill="var(--gb-bg)" stroke="var(--gb-ink)" strokeWidth="3" />
    </svg>
  );
}

function DexArt() {
  return (
    <svg viewBox="0 0 48 48" shapeRendering="crispEdges" aria-hidden="true" className="h-16 w-16">
      <rect x="8" y="6" width="32" height="36" fill="var(--gb-accent)" stroke="var(--gb-ink)" strokeWidth="2" />
      <circle cx="16" cy="14" r="4" fill="var(--gb-bg)" stroke="var(--gb-ink)" strokeWidth="2" />
      <rect x="26" y="11" width="8" height="3" fill="var(--gb-ink)" />
      <rect x="26" y="16" width="6" height="3" fill="var(--gb-ink)" />
      <rect x="12" y="24" width="24" height="4" fill="var(--gb-bg)" stroke="var(--gb-ink)" strokeWidth="1" />
      <rect x="12" y="31" width="24" height="4" fill="var(--gb-bg)" stroke="var(--gb-ink)" strokeWidth="1" />
    </svg>
  );
}

function BrushArt() {
  return (
    <svg viewBox="0 0 48 48" shapeRendering="crispEdges" aria-hidden="true" className="h-16 w-16">
      <rect x="28" y="6" width="6" height="22" fill="var(--gb-bg)" stroke="var(--gb-ink)" strokeWidth="2" transform="rotate(20 31 17)" />
      <rect x="26" y="26" width="10" height="8" fill="var(--gb-ink)" transform="rotate(20 31 30)" />
      <rect x="8" y="34" width="10" height="3" fill="var(--gb-ink)" />
      <rect x="10" y="38" width="14" height="3" fill="var(--gb-accent)" stroke="var(--gb-ink)" strokeWidth="1" />
      <rect x="6" y="30" width="6" height="3" fill="var(--gb-accent)" stroke="var(--gb-ink)" strokeWidth="1" />
    </svg>
  );
}

const TILES: Tile[] = [
  {
    href: "/build",
    title: "SET BINDERS",
    blurb: "Lay out any Pokémon TCG set — standard or master, with reverse holos and ball patterns.",
    cta: "BUILD A SET ▶",
    art: <BinderArt />,
  },
  {
    href: "/pokemon",
    title: "POKÉMON BINDERS",
    blurb: "Every card of one Pokémon across all sets — filter to secrets or the rarest per set.",
    cta: "PICK A POKÉMON ▶",
    art: <PokeballArt />,
  },
  {
    href: "/pokedex",
    title: "POKÉDEX BINDERS",
    blurb: "One pocket per Pokémon in National Dex order, defaulting to each one's best card.",
    cta: "CHOOSE A REGION ▶",
    art: <DexArt />,
  },
  {
    href: "/illustrator",
    title: "ILLUSTRATOR BINDERS",
    blurb: "Collect by artist — every card a favourite illustrator has ever drawn.",
    cta: "FIND AN ARTIST ▶",
    art: <BrushArt />,
  },
];

/** The homepage hub: one big CTA tile per binder type. */
export function HomeTiles() {
  return (
    <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2">
      {TILES.map((tile) => (
        <li key={tile.href}>
          <Link
            href={tile.href}
            className="group flex h-full items-start gap-4 border-4 border-gb-ink bg-gb-bg p-4 no-underline shadow-[4px_4px_0_0_var(--gb-ink)] transition-transform motion-safe:hover:-translate-y-1 motion-safe:hover:translate-x-0"
          >
            <span className="shrink-0">{tile.art}</span>
            <span className="flex flex-col gap-2">
              <span className="font-pixel text-xs leading-relaxed sm:text-sm">{tile.title}</span>
              <span className="font-body text-lg leading-tight">{tile.blurb}</span>
              <span className="mt-1 font-pixel text-[10px] underline-offset-2 group-hover:underline">
                {tile.cta}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
