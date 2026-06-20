import Link from "next/link";
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
    "disabled:cursor-not-allowed disabled:opacity-75",
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

/** True for app-internal paths ("/foo") — but not protocol-relative ("//cdn")
 *  or hash/mailto/external URLs — so we can hand those to next/link. */
function isInternalHref(href: string | undefined): href is string {
  return typeof href === "string" && href.startsWith("/") && !href.startsWith("//");
}

/** A GB button-styled link. Internal hrefs (with no `target`) navigate via
 *  next/link for instant client-side routing; everything else (external URLs,
 *  `target="_blank"`, hash-only, mailto, downloads) stays a plain anchor. */
export function GbLinkButton({ variant = "a", size = "md", className, ...props }: GbLinkButtonProps) {
  const linkClassName = gbButtonClasses(
    { variant, size },
    cn(
      "no-underline hover:-translate-y-px active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--gb-ink)]",
      className,
    ),
  );

  if (isInternalHref(props.href) && props.target === undefined) {
    const { href, ...rest } = props;
    return <Link href={href} className={linkClassName} {...rest} />;
  }

  return (
    // eslint-disable-next-line jsx-a11y/anchor-has-content -- children pass through
    <a className={linkClassName} {...props} />
  );
}
