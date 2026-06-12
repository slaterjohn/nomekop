import type { Metadata } from "next";
import Link from "next/link";
import { GbScreen } from "@/components/gb/gb-screen";

export const metadata: Metadata = {
  title: "Legal & credits",
  description:
    "Where Nomekop's card data and images come from, and the open-source projects we lean on. An independent fan project — not affiliated with The Pokémon Company.",
  alternates: { canonical: "/legal" },
  robots: { index: true, follow: true },
};

/**
 * Plain anchor for outbound credit links: opens in a new tab, drops the
 * referrer/opener for safety, and stays underlined so it reads as a link
 * against body prose.
 */
function OutboundLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
      {children}
    </a>
  );
}

/** Warm, human Legal & Credits page. Static — no external data. */
export default function LegalPage() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <nav className="flex flex-wrap items-center gap-3 font-pixel text-sm" aria-label="Breadcrumb">
        <Link href="/" className="no-underline">
          NOMEKOP
        </Link>
      </nav>
      <h1 className="font-pixel text-lg leading-relaxed sm:text-xl">LEGAL &amp; CREDITS</h1>
      <p className="font-body text-xl leading-tight">
        The short, friendly version of who made this, what it leans on, and what happens to your
        stuff. No fine print, promise.
      </p>

      <GbScreen title="NOT AFFILIATED">
        <p className="font-body text-xl leading-relaxed">
          Nomekop is an independent, fan-made tool built by collectors who love sorting cards. It
          is <strong>not</strong> affiliated with, endorsed by, or sponsored by Nintendo, Game
          Freak, Creatures Inc., or The Pokémon Company.
        </p>
        <p className="mt-4 font-body text-xl leading-relaxed">
          &ldquo;Pokémon&rdquo; and all related names, characters, and card images are trademarks
          and copyright of their respective owners. We just help you organise the physical cards you
          already own — the binders are yours, and so is the fun.
        </p>
      </GbScreen>

      <GbScreen title="DATA & IMAGES">
        <p className="font-body text-xl leading-relaxed">
          Nomekop stands on the shoulders of some wonderful projects. We use each of these
          gratefully, and every trademark belongs to its owner:
        </p>
        <ul className="mt-4 flex list-none flex-col gap-4 p-0">
          <li className="font-body text-xl leading-relaxed">
            <span className="font-pixel text-xs">Card data &amp; prices</span>
            <br />
            The <OutboundLink href="https://pokemontcg.io">Pokémon TCG API</OutboundLink>, an
            open developer API for the trading card game. Pricing originates from TCGplayer and is
            surfaced to us through that API.
          </li>
          <li className="font-body text-xl leading-relaxed">
            <span className="font-pixel text-xs">Card images</span>
            <br />
            Served by <OutboundLink href="https://pokemontcg.io">pokemontcg.io</OutboundLink> and{" "}
            <OutboundLink href="https://images.scrydex.com">images.scrydex.com</OutboundLink> (for
            2026 and newer sets).
          </li>
          <li className="font-body text-xl leading-relaxed">
            <span className="font-pixel text-xs">Pixel Pokémon icons</span>
            <br />
            The little sprites we use as Pokédex placeholders come from the community-maintained{" "}
            <OutboundLink href="https://github.com/PokeAPI/sprites">
              PokeAPI sprite collection
            </OutboundLink>
            . Thank you to everyone who keeps it going.
          </li>
          <li className="font-body text-xl leading-relaxed">
            <span className="font-pixel text-xs">Fonts</span>
            <br />
            &ldquo;Press Start 2P&rdquo; and &ldquo;VT323&rdquo; via{" "}
            <OutboundLink href="https://fonts.google.com">Google Fonts</OutboundLink> — both open
            source, and both the reason this place looks like a Game Boy.
          </li>
          <li className="font-body text-xl leading-relaxed">
            <span className="font-pixel text-xs">Binder product info</span>
            <br />
            Binder details and links come from{" "}
            <OutboundLink href="https://vaultx.com">Vault X</OutboundLink>.
          </li>
        </ul>
      </GbScreen>

      <GbScreen title="AFFILIATE DISCLOSURE">
        <p className="font-body text-xl leading-relaxed">
          Some outbound binder links (to Vault X or Amazon) may be affiliate links. If you buy
          through one, Nomekop earns a small commission at no extra cost to you. These only appear
          when they&apos;ve been set up — and they never change which binder we&apos;d honestly
          recommend.
        </p>
      </GbScreen>

      <GbScreen title="YOUR DATA">
        <p className="font-body text-xl leading-relaxed">
          Your collection ticks, your card picks, and your preferences live in one place: your own
          browser&apos;s local storage. There are no accounts, no servers holding your data, and
          nothing tracked or sold.
        </p>
        <p className="mt-4 font-body text-xl leading-relaxed">
          The flip side is that it&apos;s tied to this browser — clearing your browser data clears
          your Nomekop collection too. So keep that in mind before a big spring clean.
        </p>
      </GbScreen>

      <GbScreen title="CONTACT / TAKEDOWN">
        <p className="font-body text-xl leading-relaxed">
          Are you a rights-holder, or just someone with a concern? We&apos;d genuinely like to hear
          from you. Email us at{" "}
          <a href="mailto:hello@nomekop.app" className="underline">
            hello@nomekop.app
          </a>{" "}
          and we&apos;ll respond promptly.
        </p>
      </GbScreen>

      <p className="font-body text-xl leading-relaxed">
        Made by fans, for collectors.{" "}
        <span aria-hidden="true" className="text-gb-accent">
          ♥
        </span>
      </p>
    </main>
  );
}
