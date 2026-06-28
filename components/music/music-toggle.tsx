"use client";

import { Music } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMusicEnabled, trackOffset } from "@/lib/music/store";
import { startMusic, stopMusic } from "@/lib/music/engine";
import { trackForPath } from "@/lib/music/tracks";
import { useDict } from "@/components/i18n/language-provider";
import { play } from "@/lib/sound";
import { capture } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

/** Header toggle for the background soundtrack. Starting it here (in the click)
 *  is the user gesture the AudioContext needs; the MusicController takes over for
 *  navigation transitions and persisted-on resume. */
export function MusicToggle() {
  const { enabled, setEnabled } = useMusicEnabled();
  const pathname = usePathname() ?? "/";
  const dict = useDict();

  const toggle = () => {
    const next = !enabled;
    capture("music_toggled", { playing: next });
    setEnabled(next);
    if (next) {
      play("confirm");
      startMusic(trackForPath(pathname, trackOffset()));
    } else {
      play("back");
      stopMusic();
    }
  };

  return (
    <button
      type="button"
      aria-pressed={enabled}
      aria-label={enabled ? dict.audio.musicStop : dict.audio.musicPlay}
      data-no-click-sound
      onClick={toggle}
      className={cn(
        "inline-flex size-9 cursor-pointer items-center justify-center border-[3px] border-gb-ink motion-safe:transition-transform motion-safe:hover:-translate-y-0.5",
        enabled ? "bg-gb-ink text-gb-bg" : "bg-gb-bg text-gb-ink",
      )}
    >
      <Music aria-hidden="true" className={cn("size-4", enabled && "motion-safe:animate-gb-blink")} />
    </button>
  );
}
