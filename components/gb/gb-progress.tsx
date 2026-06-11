import { cn } from "@/lib/utils";

type GbProgressProps = {
  label: string;
  value: number;
  max: number;
  className?: string;
};

/**
 * HP-bar progress. The n/m fraction is always rendered as text so colour and
 * width are never the only carriers of state.
 */
export function GbProgress({ label, value, max, className }: GbProgressProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="font-pixel text-[10px] uppercase">{label}</span>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="h-4 min-w-24 flex-1 border-[3px] border-gb-ink bg-gb-bg p-px"
      >
        <div
          className="h-full bg-gb-ink motion-safe:transition-[width] motion-safe:duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-pixel text-[10px] tabular-nums">
        {value}/{max}
      </span>
    </div>
  );
}
