"use client";

import Link from "next/link";
import { FooterArcadeTrigger } from "@/components/footer-arcade-trigger";
import { useDict } from "@/components/i18n/language-provider";

/** Global footer: navigation, legal link and the not-affiliated notice.
 *  Mounted once in the root layout so every page carries it. */
export function SiteFooter() {
  const dict = useDict();
  const links = [
    { href: "/build", label: dict.footer.setBinders },
    { href: "/pokemon", label: dict.footer.pokemon },
    { href: "/pokedex", label: dict.footer.pokedex },
    { href: "/illustrator", label: dict.footer.illustrators },
    { href: "/sets", label: dict.footer.allSets },
    { href: "/facts", label: dict.footer.funFacts },
    { href: "/legal", label: dict.footer.legal },
  ];
  return (
    <footer className="mt-auto border-t-4 border-gb-ink bg-gb-bg">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 py-4 text-center">
        <nav aria-label={dict.footer.label} className="font-pixel text-[10px] uppercase">
          <ul className="m-0 flex list-none flex-wrap justify-center gap-x-4 gap-y-1 p-0">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="no-underline">
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
