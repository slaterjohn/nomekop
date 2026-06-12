import { cn } from "@/lib/utils";

type GbScreenProps = {
  /** Pixel-font caption bar rendered above the screen content. */
  title?: string;
  className?: string;
  children: React.ReactNode;
};

/**
 * A Game Boy "screen": chunky ink frame, accent inner edge and a whisper of
 * dot-matrix texture. Purely presentational — semantics come from children.
 */
export function GbScreen({ title, className, children }: GbScreenProps) {
  return (
    <section
      className={cn(
        "border-4 border-gb-ink bg-gb-bg shadow-[inset_0_0_0_2px_var(--gb-accent)]",
        className,
      )}
    >
      {title ? (
        <h2 className="border-b-4 border-gb-ink bg-gb-ink px-3 py-2 font-pixel text-xs leading-relaxed text-gb-bg sm:text-sm">
          {title}
        </h2>
      ) : null}
      <div className="relative p-3 sm:p-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(var(--gb-ink) 1px, transparent 1px)",
            backgroundSize: "4px 4px",
          }}
        />
        <div className="relative">{children}</div>
      </div>
    </section>
  );
}
