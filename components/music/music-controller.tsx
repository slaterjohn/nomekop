"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useMusicEnabled, trackOffset } from "@/lib/music/store";
import { startMusic, swapTrack, stopMusic, isPlaying } from "@/lib/music/engine";
import { trackForPath } from "@/lib/music/tracks";

/**
 * Drives the soundtrack from the persistent layout: it transitions themes as you
 * navigate between areas (Game-Boy-style), resumes a persisted-on soundtrack on
 * the first interaction after a reload, and stops when switched off. Renders
 * nothing. Starting fresh happens in the toggle's click (the required gesture).
 */
export function MusicController() {
  const { enabled } = useMusicEnabled();
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    if (!enabled) {
      stopMusic();
      return;
    }
    if (isPlaying()) {
      // Navigating between areas → cross-fade to the area's theme.
      swapTrack(trackForPath(pathname, trackOffset()));
      return;
    }
    // Enabled but silent (persisted on across a reload): the AudioContext needs a
    // gesture, so start on the next interaction.
    const start = () => startMusic(trackForPath(pathname, trackOffset()));
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, [enabled, pathname]);

  return null;
}
