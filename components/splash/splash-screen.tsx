"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useDict } from "@/components/i18n/language-provider";
import { useReducedMotion } from "@/lib/motion";
import { useSoundEnabled } from "@/lib/sound";
import { useMusicEnabled } from "@/lib/music/store";
import { playJingle } from "@/lib/music/engine";
import { cn } from "@/lib/utils";

const WORDMARK = "NOMEKOP";

/**
 * A Game Boy boot-style splash. It lives in the root layout, so it mounts exactly
 * once per full page load — which means it shows on every fresh visit but NEVER on
 * client-side navigation (clicking the logo home, moving between pages). It is
 * SSR-rendered as an overlay so the real page sits underneath (good for crawlers),
 * then fades out after a couple of seconds. Click / key / auto-timeout dismisses
 * it; honours reduce-motion.
 *
 * Deliberately absent in two cases: `disabled` (set from the DISABLE_SPLASH env so
 * e2e runs aren't blocked by a full-screen overlay), and on `/print/*` routes
 * (Puppeteer renders those to PDF under this same root layout — `print:hidden` is
 * a second guard for an actual browser print of any page).
 */
export function SplashScreen({ disabled = false }: { disabled?: boolean }) {
  const dict = useDict();
  const { reduced } = useReducedMotion();
  const { enabled: soundOn } = useSoundEnabled();
  const { enabled: musicOn } = useMusicEnabled();
  const pathname = usePathname() ?? "/";
  const [hidden, setHidden] = useState(false);

  const off = disabled || pathname.startsWith("/print");

  useEffect(() => {
    if (off) return;
    // Best-effort boot jingle (browser autoplay policy may keep it silent until
    // audio is unlocked — that's fine). Only when the user hasn't muted audio.
    if (soundOn || musicOn) playJingle();

    const hold = reduced ? 1200 : 2600;
    const hide = () => setHidden(true);
    const timer = window.setTimeout(hide, hold);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") hide();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
    // Run once on mount (per full page load); intentionally no re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (off) return null;

  return (
    <div
      aria-hidden="true"
      onClick={() => setHidden(true)}
      className={cn(
        "fixed inset-0 z-[200] flex cursor-pointer flex-col items-center justify-center gap-6 bg-gb-bg transition-opacity duration-500 print:hidden",
        // JS-independent safety net: a pure-CSS timed fade-out (see
        // `gb-splash-out` in globals.css). If the client bundle never loads or
        // hydrates — a firewall-blocked chunk, offline, an extension, a hydration
        // crash — none of the JS dismiss paths below attach, and without this the
        // SSR overlay would block the (perfectly usable) server-rendered page
        // forever. The JS timer/click/key are the fast path; this is the floor.
        // Dropped once JS dismisses so the opacity transition above owns the fade.
        !hidden && "animate-gb-splash-out",
        hidden && "pointer-events-none opacity-0",
      )}
      data-splash={hidden ? "out" : "in"}
    >
      {/* Boot-screen frame — a thick bezel + dot-matrix, distinct from any page. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-3 border-4 border-gb-ink opacity-60 sm:inset-6"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "radial-gradient(var(--gb-ink) 1px, transparent 1px)",
          backgroundSize: "4px 4px",
        }}
      />

      <span className="relative inline-flex flex-col items-center border-[4px] border-gb-ink bg-gb-accent px-6 py-4 shadow-[5px_5px_0_0_var(--gb-ink)]">
        <span className="inline-block origin-center font-pixel text-3xl leading-none text-gb-ink motion-safe:animate-gb-wordmark-word sm:text-5xl">
          {WORDMARK.split("").map((letter, i) => (
            <span
              key={i}
              className="inline-block origin-center motion-safe:animate-gb-wordmark-letter"
              style={{ animationDelay: `${1.5 + i * 0.1}s` }}
            >
              {letter}
            </span>
          ))}
        </span>
        <span className="mt-2 font-body text-base leading-none text-gb-ink sm:text-xl">
          {dict.home.tagline}
        </span>
      </span>

      <span className="relative font-pixel text-[10px] uppercase text-gb-ink motion-safe:animate-gb-blink">
        {dict.audio.splashSkip} ▶
      </span>
    </div>
  );
}
