type PixelPokeballProps = {
  /** CSS size; the artwork is a crisp 16×16 pixel grid. */
  size?: number | string;
  className?: string;
};

/**
 * The 8-bit Poké Ball (same 16×16 art as the favicon): three-tone, hard
 * pixels. Decorative — callers provide semantics.
 */
export function PixelPokeball({ size = 24, className }: PixelPokeballProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={className}
    >
      <rect x="5" y="2" width="6" height="1" fill="var(--gb-ink)" />
      <rect x="3" y="3" width="2" height="1" fill="var(--gb-ink)" />
      <rect x="11" y="3" width="2" height="1" fill="var(--gb-ink)" />
      <rect x="5" y="3" width="6" height="1" fill="var(--gb-accent)" />
      <rect x="2" y="4" width="1" height="2" fill="var(--gb-ink)" />
      <rect x="13" y="4" width="1" height="2" fill="var(--gb-ink)" />
      <rect x="3" y="4" width="10" height="2" fill="var(--gb-accent)" />
      <rect x="1" y="6" width="1" height="4" fill="var(--gb-ink)" />
      <rect x="14" y="6" width="1" height="4" fill="var(--gb-ink)" />
      <rect x="2" y="6" width="12" height="1" fill="var(--gb-accent)" />
      <rect x="2" y="7" width="12" height="1" fill="var(--gb-ink)" />
      <rect x="2" y="8" width="3" height="1" fill="var(--gb-ink)" />
      <rect x="11" y="8" width="3" height="1" fill="var(--gb-ink)" />
      <rect x="5" y="8" width="2" height="1" fill="var(--gb-ink)" />
      <rect x="7" y="8" width="2" height="1" fill="var(--gb-bg)" />
      <rect x="9" y="8" width="2" height="1" fill="var(--gb-ink)" />
      <rect x="2" y="9" width="4" height="1" fill="var(--gb-bg)" />
      <rect x="6" y="9" width="1" height="1" fill="var(--gb-ink)" />
      <rect x="7" y="9" width="2" height="1" fill="var(--gb-bg)" />
      <rect x="9" y="9" width="1" height="1" fill="var(--gb-ink)" />
      <rect x="10" y="9" width="4" height="1" fill="var(--gb-bg)" />
      <rect x="2" y="10" width="1" height="2" fill="var(--gb-ink)" />
      <rect x="13" y="10" width="1" height="2" fill="var(--gb-ink)" />
      <rect x="3" y="10" width="3" height="1" fill="var(--gb-bg)" />
      <rect x="6" y="10" width="4" height="1" fill="var(--gb-ink)" />
      <rect x="10" y="10" width="3" height="1" fill="var(--gb-bg)" />
      <rect x="3" y="11" width="10" height="1" fill="var(--gb-bg)" />
      <rect x="3" y="12" width="2" height="1" fill="var(--gb-ink)" />
      <rect x="11" y="12" width="2" height="1" fill="var(--gb-ink)" />
      <rect x="5" y="12" width="6" height="1" fill="var(--gb-bg)" />
      <rect x="5" y="13" width="6" height="1" fill="var(--gb-ink)" />
    </svg>
  );
}
