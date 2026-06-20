"use client";

import { useEffect, useRef } from "react";
import { play, useSoundEnabled } from "@/lib/sound";

/** Elements that should feel "clickable" and therefore make a sound. */
const CLICKABLE = 'a[href], button, [role="button"], summary, label, [data-click-sound]';

/**
 * One global, capture-phase click listener that gives every interactive element
 * a subtle "move" blip — so nav links (which have no sound of their own) click
 * like everything else. Components with their own richer cue opt out by marking
 * their root `data-no-click-sound`; disabled controls are skipped.
 *
 * Renders nothing. Mount once in the root layout.
 */
export function UiClickSound() {
  const { enabled } = useSoundEnabled();
  // Keep the listener reading the latest `enabled` without re-subscribing (and so
  // re-binding the document listener) on every change. Syncing the ref in its own
  // effect satisfies react-hooks (a ref write in render body is disallowed here)
  // and is not setState-in-effect.
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!enabledRef.current) return;
      const target = event.target;
      if (!(target instanceof Element)) return;

      const el = target.closest(CLICKABLE);
      if (!el) return;

      // A component that plays its own cue marks its subtree opted-out.
      if (el.closest("[data-no-click-sound]")) return;

      // Don't blip on disabled controls.
      if (el.matches(":disabled") || el.getAttribute("aria-disabled") === "true") return;

      play("move");
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
