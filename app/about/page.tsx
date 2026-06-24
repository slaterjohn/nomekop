import type { Metadata } from "next";
import Link from "next/link";
import { GbScreen } from "@/components/gb/gb-screen";
import { JsonLd } from "@/components/json-ld";
import { aboutPageJsonLd, breadcrumbJsonLd } from "@/lib/structured-data";

const TITLE = "About Nomekop";
const DESCRIPTION =
  "Who makes Nomekop and why — a Pokémon TCG binder-layout tool built by John, a collector in Preston, UK. What it does, where the card data comes from, and how to get in touch.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  robots: { index: true, follow: true },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/about" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

/** Warm, human About page — the "who's behind this" trust signal. Static. */
export default function AboutPage() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <JsonLd
        data={[
          aboutPageJsonLd("John"),
          breadcrumbJsonLd([
            { name: "NOMEKOP", path: "/" },
            { name: "About", path: "/about" },
          ]),
        ]}
      />
      <h1 className="font-pixel text-lg uppercase leading-relaxed sm:text-xl">About</h1>
      <p className="font-body text-xl leading-tight">
        The short story of who&apos;s behind Nomekop, and why it exists.
      </p>

      <GbScreen title="Hi, I'm John">
        <p className="font-body text-xl leading-relaxed">
          I&apos;m a Pokémon TCG collector based in <strong>Preston, in the UK</strong>. I started
          collecting as a nine-year-old, back with the very first sets — then, like a lot of
          people, I drifted away from it. These days I&apos;m happily back into it as an adult,
          binders and all.
        </p>
        <p className="mt-4 font-body text-xl leading-relaxed">
          Nomekop is a passion project. I built it for the simple love of sorting cards — laying a
          collection out properly, working out what a complete set actually needs, and turning that
          into something you can print and slot into a binder.
        </p>
      </GbScreen>

      <GbScreen title="What Nomekop does">
        <p className="font-body text-xl leading-relaxed">
          Pick a set, a Pokémon, or an illustrator, and Nomekop lays out a binder for you — choose
          your pocket size, decide whether you&apos;re chasing a master set with all the reverse
          holos and special patterns, tick off what you own, and download tidy A4 pages to print.
          It&apos;s free, there are no accounts, and your collection ticks stay in your own browser.
        </p>
      </GbScreen>

      <GbScreen title="And the name?">
        <p className="font-body text-xl leading-relaxed">
          &ldquo;Nomekop&rdquo; is just <strong>Pokémon spelled backwards</strong>. That&apos;s the
          whole secret. It felt right for a little fan tool — familiar, but its own thing.
        </p>
      </GbScreen>

      <GbScreen title="Where the data comes from — and how accurate it is">
        <p className="font-body text-xl leading-relaxed">
          Card details and prices come from the open{" "}
          <a href="https://pokemontcg.io" target="_blank" rel="noopener noreferrer" className="underline">
            Pokémon TCG API
          </a>{" "}
          (prices via TCGplayer). The full credits live on the{" "}
          <Link href="/legal" className="underline">
            Legal &amp; credits
          </Link>{" "}
          page.
        </p>
        <p className="mt-4 font-body text-xl leading-relaxed">
          I take the numbers seriously. Master-set counts for the most recent eras are checked
          against collector guides; older sets are best-effort and carry a little &ldquo;may be
          inaccurate&rdquo; note where the count isn&apos;t fully verified. If you ever spot
          something wrong, please{" "}
          <Link href="/report" className="underline">
            tell me
          </Link>{" "}
          — I read every report and fix what I can.
        </p>
      </GbScreen>

      <GbScreen title="Say hello">
        <p className="font-body text-xl leading-relaxed">
          Questions, ideas, or just want to talk binders? Email{" "}
          <a href="mailto:hello@nomekop.app" className="underline">
            hello@nomekop.app
          </a>
          . Nomekop is an independent fan project and isn&apos;t affiliated with Nintendo or The
          Pokémon Company — more on that on the{" "}
          <Link href="/legal" className="underline">
            Legal &amp; credits
          </Link>{" "}
          page.
        </p>
      </GbScreen>

      <p className="font-body text-xl leading-relaxed">
        Thanks for stopping by.{" "}
        <span aria-hidden="true" className="text-gb-accent">
          ♥
        </span>
      </p>
    </main>
  );
}
