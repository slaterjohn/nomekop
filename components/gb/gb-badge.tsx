import { cn } from "@/lib/utils";

type GbBadgeProps = React.ComponentProps<"span">;

/** Tiny pixel-font tag (e.g. the REV mark on reverse-holo slots). */
export function GbBadge({ className, ...props }: GbBadgeProps) {
  return (
    <span
      className={cn(
        "inline-block border-2 border-gb-ink bg-gb-ink px-1 py-0.5 font-pixel text-[8px] uppercase leading-none text-gb-bg",
        className,
      )}
      {...props}
    />
  );
}
