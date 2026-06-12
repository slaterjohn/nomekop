import Link from "next/link";
import { FooterArcadeTrigger } from "@/components/footer-arcade-trigger";

/** Global footer: navigation, legal link and the not-affiliated notice.
 *  Mounted once in the root layout so every page carries it. */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t-4 border-gb-ink bg-gb-bg">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 py-4 text-center">
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-4 gap-y-1 font-pixel text-[10px]">
          <Link href="/build" className="no-underline">
            SET BINDERS
          </Link>
          <Link href="/pokemon" className="no-underline">
            POKÉMON
          </Link>
          <Link href="/pokedex" className="no-underline">
            POKÉDEX
          </Link>
          <Link href="/illustrator" className="no-underline">
            ILLUSTRATORS
          </Link>
          <Link href="/sets" className="no-underline">
            ALL SETS
          </Link>
          <Link href="/legal" className="no-underline">
            LEGAL &amp; CREDITS
          </Link>
        </nav>
        <p className="flex items-center justify-center gap-2 font-pixel text-[9px] leading-relaxed">
          <span>NOMEKOP · A FAN-MADE TOOL · NOT AFFILIATED WITH NINTENDO / THE POKÉMON COMPANY</span>
          <FooterArcadeTrigger />
        </p>
      </div>
    </footer>
  );
}
