import type { Metadata } from "next";
import Link from "next/link";
import { GbScreen } from "@/components/gb/gb-screen";
import { GbLinkButton } from "@/components/gb/gb-button";
import { IllustratorSearchForm } from "@/components/illustrator/illustrator-search-form";
import { encodeIllustratorToken, DEFAULT_ILLUSTRATOR_OPTIONS } from "@/lib/illustrator-binder";

export const metadata: Metadata = {
  title: "Illustrator binders — every card by an artist",
  description:
    "Pick a Pokemon TCG illustrator and build a printable binder of every card they have ever drawn — across every set, newest or oldest first.",
  alternates: { canonical: "/illustrator" },
};

const POPULAR = [
  "Ken Sugimori",
  "Mitsuhiro Arita",
  "5ban Graphics",
  "Kagemaru Himeno",
  "Atsuko Nishida",
  "Naoki Saito",
];

/** Landing page: search any illustrator, or jump to a prolific one. */
export default function IllustratorLandingPage() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="font-pixel text-lg leading-relaxed sm:text-xl">ILLUSTRATOR BINDERS</h1>
      <p className="font-body text-xl leading-tight">
        One artist, every card they have ever drawn — across every set. Order by release date,
        then print the whole gallery.
      </p>
      <p className="font-body text-xl leading-tight">
        <Link
          href="/facts/most-prolific-pokemon-illustrators"
          className="underline underline-offset-2"
        >
          See the most prolific illustrators ▶
        </Link>
      </p>

      <GbScreen title="CHOOSE YOUR ILLUSTRATOR">
        <div className="flex flex-col gap-4">
          <IllustratorSearchForm />
          <p className="font-pixel text-[10px]">POPULAR</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR.map((name) => (
              <GbLinkButton
                key={name}
                variant="b"
                size="sm"
                href={`/illustrator/${encodeIllustratorToken(name, DEFAULT_ILLUSTRATOR_OPTIONS)}`}
              >
                {name.toUpperCase()}
              </GbLinkButton>
            ))}
          </div>
        </div>
      </GbScreen>
    </main>
  );
}
