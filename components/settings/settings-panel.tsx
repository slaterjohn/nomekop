"use client";

import { SettingsIcon, XIcon } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GbToggle } from "@/components/gb/gb-toggle";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { useSoundEnabled, play } from "@/lib/sound";
import { useReducedMotion } from "@/lib/motion";

/**
 * The app's personalisation knobs in one header-launched dialog: colour palette,
 * sound cues, and a master "reduce animation" switch. Base UI's Dialog gives us
 * the focus trap, Escape-to-close, and focus restoration for free.
 */
export function SettingsPanel() {
  const { enabled: soundOn, setEnabled: setSound } = useSoundEnabled();
  const { reduced, setReduced } = useReducedMotion();

  return (
    <Dialog>
      <DialogTrigger
        aria-label="Settings"
        className="inline-flex size-9 cursor-pointer items-center justify-center border-[3px] border-gb-ink bg-gb-bg text-gb-ink motion-safe:transition-transform motion-safe:hover:-translate-y-0.5"
      >
        <SettingsIcon aria-hidden="true" className="size-4" />
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="grid gap-5 rounded-none border-[3px] border-gb-ink bg-gb-bg text-gb-ink shadow-[4px_4px_0_0_var(--gb-ink)] ring-0"
      >
        <DialogClose
          aria-label="Close settings"
          className="absolute top-2 right-2 inline-flex size-7 cursor-pointer items-center justify-center border-[3px] border-gb-ink bg-gb-bg text-gb-ink"
        >
          <XIcon aria-hidden="true" className="size-4" />
        </DialogClose>

        <DialogTitle className="font-pixel text-base text-gb-ink">SETTINGS</DialogTitle>
        <DialogDescription className="font-body text-lg leading-tight text-gb-ink">
          Make it yours — palette, sound, and motion. Saved to this browser.
        </DialogDescription>

        <section className="flex flex-col gap-2">
          <h3 className="font-pixel text-[10px] text-gb-ink">PALETTE</h3>
          <div className="flex flex-wrap">
            <ThemeSwitcher />
          </div>
        </section>

        <section className="flex flex-col gap-1">
          <h3 className="font-pixel text-[10px] text-gb-ink">SOUND &amp; MOTION</h3>
          <GbToggle
            label="SOUND"
            checked={soundOn}
            onChange={(on) => {
              setSound(on);
              if (on) play("success");
            }}
          />
          <GbToggle label="REDUCE ANIMATION" checked={reduced} onChange={setReduced} />
        </section>
      </DialogContent>
    </Dialog>
  );
}
