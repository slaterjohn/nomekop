import { cn } from "@/lib/utils";
import { PixelPokeball } from "@/components/gb/pixel-pokeball";

type GbSpinnerProps = {
  label?: string;
  className?: string;
};

/**
 * 8-bit Poké Ball loading state. The wobble snaps between frames
 * (steps timing) like a sprite; the status role + label carry the meaning.
 */
export function GbSpinner({ label = "Loading…", className }: GbSpinnerProps) {
  return (
    <div role="status" className={cn("inline-flex items-center gap-3", className)}>
      <span
        aria-hidden="true"
        className="inline-block origin-bottom motion-safe:animate-[gb-wobble_0.8s_steps(4,end)_infinite]"
      >
        <PixelPokeball size={26} />
      </span>
      <span className="font-pixel text-xs uppercase">{label}</span>
    </div>
  );
}
