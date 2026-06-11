"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Game Boy dialogue reveal. Returns the visible slice of `text`, whether the
 * reveal finished, and a skip() to jump to the end. Instant under
 * prefers-reduced-motion.
 *
 * A single interval (not chained timeouts) drives the reveal so ticks advance
 * independently of render timing.
 */
export function useTypewriter(text: string, speedMs = 18) {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(reduced ? text.length : 0);
  // Reset when inputs change — React's "adjust state during render" pattern
  // (avoids a cascading-render effect).
  const [prev, setPrev] = useState({ text, reduced });
  if (prev.text !== text || prev.reduced !== reduced) {
    setPrev({ text, reduced });
    setCount(reduced ? text.length : 0);
  }
  const done = count >= text.length;

  useEffect(() => {
    if (reduced || done) return;
    const iv = setInterval(() => setCount((c) => Math.min(c + 1, text.length)), speedMs);
    return () => clearInterval(iv);
  }, [reduced, done, text, speedMs]);

  return {
    display: text.slice(0, count),
    done,
    skip: () => setCount(text.length),
  };
}
