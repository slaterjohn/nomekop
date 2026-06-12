import { cn } from "@/lib/utils";

type GbSpinnerProps = {
  label?: string;
  className?: string;
};

/**
 * Poke Ball loading state. The wobble is decorative (motion-safe only); the
 * status role + visible label carry the meaning.
 */
export function GbSpinner({ label = "LOADING…", className }: GbSpinnerProps) {
  return (
    <div role="status" className={cn("inline-flex items-center gap-3", className)}>
      <span
        aria-hidden="true"
        className="relative inline-block size-6 origin-bottom overflow-hidden rounded-full border-[3px] border-gb-ink bg-gb-bg motion-safe:animate-[gb-wobble_0.8s_ease-in-out_infinite]"
      >
        <span className="absolute inset-x-0 top-0 h-1/2 bg-gb-accent" />
        <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-gb-ink" />
        <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-gb-ink bg-gb-bg" />
      </span>
      <span className="font-pixel text-xs">{label}</span>
    </div>
  );
}
