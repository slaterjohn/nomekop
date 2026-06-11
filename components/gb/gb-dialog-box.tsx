"use client";

import { cn } from "@/lib/utils";
import { useTypewriter } from "@/lib/use-typewriter";

type GbDialogBoxProps = {
  /** Plain text only — the typewriter slices characters. */
  children: string;
  tone?: "info" | "error";
  /** Renders the blinking ▼ continue affordance once text is done. */
  onContinue?: () => void;
  continueLabel?: string;
  className?: string;
};

/**
 * The Pokemon dialogue box: double-line border, typewriter text, blinking ▼.
 * Screen readers get the full text immediately via a polite live region; the
 * animated copy is aria-hidden. Click anywhere to skip the reveal.
 */
export function GbDialogBox({
  children,
  tone = "info",
  onContinue,
  continueLabel = "Continue",
  className,
}: GbDialogBoxProps) {
  const { display, done, skip } = useTypewriter(children);

  return (
    // Click-to-skip is a pointer convenience; keyboard users get the full text
    // from the live region immediately, so no key handler is required.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <div
      data-gb-dialog
      role={tone === "error" ? "alert" : undefined}
      onClick={skip}
      className={cn(
        "relative border-4 border-double border-gb-ink bg-gb-bg p-3",
        "shadow-[inset_0_0_0_2px_var(--gb-bg),inset_0_0_0_4px_var(--gb-ink)]",
        className,
      )}
    >
      <p aria-live="polite" className="sr-only">
        {children}
      </p>
      <p aria-hidden="true" data-gb-typewriter className="min-h-6 whitespace-pre-wrap text-xl leading-snug">
        {display}
      </p>
      {onContinue && done ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onContinue();
          }}
          aria-label={continueLabel}
          className="absolute bottom-1 right-2 cursor-pointer p-1"
        >
          <span data-gb-more aria-hidden="true" className="font-pixel text-xs motion-safe:animate-gb-blink">
            ▼
          </span>
        </button>
      ) : null}
    </div>
  );
}
