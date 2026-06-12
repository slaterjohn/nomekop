import { cn } from "@/lib/utils";

type GbVariantProps = {
  /** a = primary (accent fill), b = secondary (bg fill), plain = borderless. */
  variant?: "a" | "b" | "plain";
  size?: "md" | "sm";
};

type GbButtonProps = React.ComponentProps<"button"> & GbVariantProps;

function gbButtonClasses({ variant = "a", size = "md" }: GbVariantProps, className?: string) {
  return cn(
    "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 border-[3px] border-gb-ink font-pixel uppercase leading-none",
    "shadow-[3px_3px_0_0_var(--gb-ink)] motion-safe:transition-[transform,box-shadow] motion-safe:duration-75",
    "disabled:cursor-not-allowed disabled:opacity-50",
    variant === "a" && "bg-gb-accent text-gb-ink",
    variant === "b" && "bg-gb-bg text-gb-ink",
    variant === "plain" && "border-transparent bg-transparent text-gb-ink shadow-none",
    size === "md" && "px-4 py-2 text-xs",
    size === "sm" && "min-h-11 px-3 py-1 text-[10px]",
    className,
  );
}

/**
 * A chunky Game Boy action button. Press depth comes from a 1px translate +
 * hard shadow swap (motion-safe); the 44px min height keeps targets generous.
 */
export function GbButton({ variant = "a", size = "md", className, type = "button", ...props }: GbButtonProps) {
  return (
    <button
      type={type}
      className={gbButtonClasses(
        { variant, size },
        cn(
          "enabled:hover:-translate-y-px enabled:active:translate-x-[2px] enabled:active:translate-y-[2px] enabled:active:shadow-[1px_1px_0_0_var(--gb-ink)]",
          className,
        ),
      )}
      {...props}
    />
  );
}

type GbLinkButtonProps = React.ComponentProps<"a"> & GbVariantProps;

/** An anchor in GB button clothing (external links, downloads). */
export function GbLinkButton({ variant = "a", size = "md", className, ...props }: GbLinkButtonProps) {
  return (
    // eslint-disable-next-line jsx-a11y/anchor-has-content -- children pass through
    <a
      className={gbButtonClasses(
        { variant, size },
        cn(
          "no-underline hover:-translate-y-px active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--gb-ink)]",
          className,
        ),
      )}
      {...props}
    />
  );
}
