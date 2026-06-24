import { cn } from "@/lib/utils";

type GbBadgeProps = React.ComponentProps<"span">;

/** Tiny pixel-font tag (e.g. the REV mark on reverse-holo slots). When given an
 *  `aria-label` (a fuller description than the abbreviated visible text), it
 *  takes role="img" — an `aria-label` on a bare <span> is ignored by screen
 *  readers, so without this the description would be lost (WCAG 4.1.2). */
export function GbBadge({ className, role, ...props }: GbBadgeProps) {
  const resolvedRole = role ?? (props["aria-label"] ? "img" : undefined);
  return (
    <span
      role={resolvedRole}
      className={cn(
        "inline-block border-2 border-gb-ink bg-gb-ink px-1 py-0.5 font-pixel text-[8px] uppercase leading-none text-gb-bg",
        className,
      )}
      {...props}
    />
  );
}
