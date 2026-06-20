import Link from "next/link";

type Tile = {
  href: string;
  title: string;
  blurb: string;
  cta: string;
  art: React.ReactNode;
};

/*
 * Tile icons from Pixelarticons (MIT © Gerrit Halfmann, https://pixelarticons.com).
 * Inlined as paths so they inherit the active palette via currentColor and stay
 * crisp on the pixel grid. Credited on /legal.
 */
function PixelIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="size-16 text-gb-ink"
    >
      {children}
    </svg>
  );
}

/** Binder pockets. */
function GridIcon() {
  return (
    <PixelIcon>
      <path d="M4 2h16v2H4zm0 18h16v2H4zM2 4h2v16H2zm18 0h2v16h-2zM4 8h16v2H4zm0 6h16v2H4z" />
      <path d="M8 4h2v16H8zm6 0h2v16h-2z" />
    </PixelIcon>
  );
}

/** A single trading card. */
function CardIcon() {
  return (
    <PixelIcon>
      <path d="M4 4h16v2H4zm0 14h16v2H4zM2 6h2v12H2zm18 0h2v12h-2z" />
    </PixelIcon>
  );
}

/** A catalogue list — the Pokédex. */
function ListIcon() {
  return (
    <PixelIcon>
      <path d="M4 2h16v2H4zm2 5h2v2H6zm4 0h8v2h-8zm-4 4h2v2H6zm4 0h8v2h-8zm-4 4h2v2H6zm4 0h8v2h-8zm-6 5h16v2H4zM2 4h2v16H2zm18 0h2v16h-2z" />
    </PixelIcon>
  );
}

/** A paintbrush — the illustrator. */
function BrushIcon() {
  return (
    <PixelIcon>
      <path d="M7 2h10v2H7zM5 4h2v10H5zm12-2h2v12h-2z" />
      <path d="M13 2h2v6h-2zM9 2h2v4H9zm-4 8h14v2H5zm2 4h10v2H7zm2 2h2v4H9zm4 0h2v4h-2zm-4 4h6v2H9z" />
    </PixelIcon>
  );
}

const TILES: Tile[] = [
  {
    // Browse sets at /sets — the single set-browsing entry — then build from there.
    href: "/sets",
    title: "Set binders",
    blurb: "Lay out any Pokémon TCG set — standard or master, with reverse holos and ball patterns.",
    cta: "Browse sets ▶",
    art: <GridIcon />,
  },
  {
    href: "/pokemon",
    title: "Pokémon binders",
    blurb: "Every card of one Pokémon across all sets — filter to secrets or the rarest per set.",
    cta: "Pick a Pokémon ▶",
    art: <CardIcon />,
  },
  {
    href: "/pokedex",
    title: "Pokédex binders",
    blurb: "One pocket per Pokémon in National Dex order, defaulting to each one's best card.",
    cta: "Choose a region ▶",
    art: <ListIcon />,
  },
  {
    href: "/illustrator",
    title: "Illustrator binders",
    blurb: "Collect by artist — every card a favourite illustrator has ever drawn.",
    cta: "Find an artist ▶",
    art: <BrushIcon />,
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
              <span className="font-pixel text-xs uppercase leading-relaxed sm:text-sm">
                {tile.title}
              </span>
              <span className="font-body text-lg leading-tight">{tile.blurb}</span>
              <span className="mt-1 font-pixel text-[10px] uppercase underline-offset-2 group-hover:underline">
                {tile.cta}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
