"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { MusicToggle } from "@/components/music/music-toggle";
import { useDict } from "@/components/i18n/language-provider";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

const WORDMARK = "NOMEKOP";

const NAV: Array<{ href: string; key: keyof Dictionary["nav"]; match: (p: string) => boolean }> = [
  {
    href: "/build",
    key: "sets",
    // The whole set flow: builder, configured binders, the crawlable set hub,
    // and the per-set card/collection child pages.
    match: (p) =>
      p === "/build" ||
      p.startsWith("/b/") ||
      p.startsWith("/set") ||
      p.startsWith("/card") ||
      p.startsWith("/collection"),
  },
  { href: "/pokemon", key: "pokemon", match: (p) => p.startsWith("/pokemon") },
  { href: "/pokedex", key: "pokedex", match: (p) => p.startsWith("/pokedex") },
  { href: "/illustrator", key: "art", match: (p) => p.startsWith("/illustrator") },
  { href: "/binders", key: "binders", match: (p) => p.startsWith("/binders") },
];

/** Title bar: a bounded logo home-link, a clear nav tab row, palette + sound. */
export function Header() {
  const pathname = usePathname() ?? "/";
  const dict = useDict();

  return (
    <header className="border-b-4 border-gb-ink bg-gb-bg">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Logo: a clearly-bounded home button so it reads as a brand mark,
              not body text — especially on mobile. */}
          <Link
            href="/"
            aria-label={`${WORDMARK} home`}
            className="inline-flex flex-col items-start border-[3px] border-gb-ink bg-gb-accent px-3 py-1.5 no-underline shadow-[3px_3px_0_0_var(--gb-ink)]"
          >
            {/* On first load this spells POKEMON (whole word mirrored + each
                letter mirrored = readable, reversed order). After a beat the
                whole word flips first, then each letter flips to NOMEKOP. */}
            <span
              className="inline-block origin-center font-pixel text-base leading-none text-gb-ink motion-safe:animate-gb-wordmark-word sm:text-2xl"
              aria-hidden="true"
            >
              {WORDMARK.split("").map((letter, i) => (
                <span
                  key={i}
                  className="inline-block origin-center motion-safe:animate-gb-wordmark-letter"
                  // The word has already flipped back to NOMEKOP order, so flip
                  // the letters left to right.
                  style={{ animationDelay: `${1.5 + i * 0.1}s` }}
                >
                  {letter}
                </span>
              ))}
            </span>
            <span className="mt-1 font-body text-sm leading-none text-gb-ink sm:text-base">
              {dict.home.tagline}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <MusicToggle />
            <SettingsPanel />
          </div>
        </div>

        <nav aria-label="Primary" className="-mx-1 overflow-x-auto">
          <ul className="flex min-w-max list-none items-stretch gap-1.5 p-1">
            {NAV.map((item) => {
              const active = item.match(pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-9 items-center border-[3px] border-gb-ink px-3 py-1 font-pixel text-[10px] uppercase no-underline sm:text-xs",
                      active
                        ? "bg-gb-ink text-gb-bg"
                        : "bg-gb-bg text-gb-ink motion-safe:transition-transform motion-safe:hover:-translate-y-0.5",
                    )}
                  >
                    {dict.nav[item.key]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
