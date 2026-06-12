import { cn } from "@/lib/utils";

/**
 * Battle-transition reveal: venetian-blind clip-path on mount (motion-safe;
 * reduced-motion users see content instantly via the global media query).
 * Content is in the accessibility tree from the first frame.
 */
export function GbWipe({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("motion-safe:animate-gb-wipe", className)}>{children}</div>;
}
