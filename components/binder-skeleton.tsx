import { GbScreen } from "@/components/gb/gb-screen";
import { GbSpinner } from "@/components/gb/gb-spinner";

type BinderSkeletonProps = {
  /** What's being gathered, e.g. "every Charizard print". */
  what?: string;
  rows?: number;
  cols?: number;
};

/** Placeholder layout shown while a cross-set binder query warms (cold can
 *  take a while). Mirrors the real page so loading reads as progress, not a
 *  broken screen. Pure presentation — no data needed. */
export function BinderSkeleton({ what = "cards", rows = 3, cols = 4 }: BinderSkeletonProps) {
  const pockets = Array.from({ length: rows * cols });
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <GbSpinner label={`Gathering ${what}…`} />

      <GbScreen title="Binder options">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="h-9 w-16 border-[3px] border-gb-ink bg-gb-accent/40 motion-safe:animate-pulse"
              />
            ))}
          </div>
          <span aria-hidden="true" className="h-5 w-56 bg-gb-accent/40 motion-safe:animate-pulse" />
        </div>
      </GbScreen>

      <GbScreen title="Preview">
        <div
          aria-hidden="true"
          className="grid gap-1.5 border-[3px] border-gb-ink bg-gb-accent/30 p-1.5"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {pockets.map((_, i) => (
            <span
              key={i}
              className="aspect-[63/88] border-2 border-gb-ink/40 bg-gb-bg motion-safe:animate-pulse"
              style={{ animationDelay: `${(i % cols) * 80}ms` }}
            />
          ))}
        </div>
      </GbScreen>
    </div>
  );
}
