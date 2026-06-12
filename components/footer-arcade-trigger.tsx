"use client";

import { useState } from "react";
import { PixelPokeball } from "@/components/gb/pixel-pokeball";
import { triggerArcade } from "@/components/easter-eggs/easter-eggs";

/** A tiny pixel Poké Ball tucked in the footer — click it three times to
 *  unlock the secret arcade. Labelled vaguely so it stays a discovery. */
export function FooterArcadeTrigger() {
  const [clicks, setClicks] = useState(0);

  return (
    <button
      type="button"
      aria-label="Lucky Poké Ball"
      title="…"
      onClick={() => {
        const next = clicks + 1;
        setClicks(next);
        if (next >= 3) {
          setClicks(0);
          triggerArcade();
        }
      }}
      className="inline-flex size-6 items-center justify-center opacity-70 transition-opacity hover:opacity-100"
    >
      <PixelPokeball size={18} />
    </button>
  );
}
