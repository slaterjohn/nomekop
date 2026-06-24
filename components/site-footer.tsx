"use client";

import Link from "next/link";
import { FooterArcadeTrigger } from "@/components/footer-arcade-trigger";
import { useDict } from "@/components/i18n/language-provider";

/** Global footer: navigation, legal link and the not-affiliated notice.
 *  Mounted once in the root layout so every page carries it. */
export function SiteFooter() {
  const dict = useDict();
  const links = [
    // /sets is the single set-browsing entry (the old /build "Set binders"
    // link is gone — /build is builder-only now).
    { href: "/sets", label: dict.footer.allSets },
    { href: "/pokemon", label: dict.footer.pokemon },
    { href: "/pokedex", label: dict.footer.pokedex },
    { href: "/illustrator", label: dict.footer.illustrators },
    { href: "/facts", label: dict.footer.funFacts },
    { href: "/faqs", label: dict.footer.faqs },
    { href: "/about", label: dict.footer.about },
    { href: "/legal", label: dict.footer.legal },
    { href: "/accessibility", label: dict.footer.accessibility },
  ];
  return (
    <footer className="mt-auto border-t-4 border-gb-ink bg-gb-bg">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 py-4 text-center">
        <nav aria-label={dict.footer.label} className="font-pixel text-[10px] uppercase">
          <ul className="m-0 flex list-none flex-wrap justify-center gap-x-1 gap-y-0 p-0">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-11 items-center px-2 no-underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="flex items-center justify-center gap-2 font-pixel text-[9px] leading-relaxed">
          <span>{dict.footer.disclaimer}</span>
          <FooterArcadeTrigger />
        </p>
      </div>
    </footer>
  );
}
