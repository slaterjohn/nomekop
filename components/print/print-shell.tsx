import { cn } from "@/lib/utils";
import type { BinderConfig } from "@/lib/config";

/** Common wrapper for all print views; flips the retro typography class. */
export function PrintShell({
  style,
  children,
}: {
  style: BinderConfig["style"];
  children: React.ReactNode;
}) {
  return <div className={cn("print-root", style === "retro" && "print-retro")}>{children}</div>;
}

/** Card images go through the caching proxy so PDF renders are hermetic. */
export function proxiedImage(src: string): string {
  return src ? `/api/img?src=${encodeURIComponent(src)}` : "";
}
