import type { Metadata } from "next";
import Link from "next/link";
import { GbScreen } from "@/components/gb/gb-screen";
import { GbLinkButton } from "@/components/gb/gb-button";
import { GENERATIONS } from "@/lib/pokedex";

export const metadata: Metadata = {
  title: "Pokédex binders — one pocket per Pokémon",
  description:
    "Build a printable Pokédex binder: one pocket for every Pokémon in National Dex order, defaulting to each Pokémon's secret or rarest card — swap any pick, share the link.",
  alternates: { canonical: "/pokedex" },
};

/** Generation chooser — each leads to a default Pokédex binder token. */
export default function PokedexLandingPage() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <nav className="flex flex-wrap items-center gap-3 font-pixel text-sm" aria-label="Breadcrumb">
        <Link href="/" className="no-underline">
          NOMEKOP
        </Link>
      </nav>
      <h1 className="font-pixel text-lg leading-relaxed sm:text-xl">POKÉDEX BINDERS</h1>
      <p className="font-body text-xl leading-tight">
        One pocket per Pokémon in National Dex order. Each pocket defaults to that Pokémon&apos;s
        secret card — or its rarest print — and you can swap any pick. Your choices are saved
        and the link stays shareable.
      </p>

      <GbScreen title="CHOOSE A GENERATION">
        <ul className="grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-3">
          {GENERATIONS.map((gen) => (
            <li key={gen.id}>
              <GbLinkButton
                variant="b"
                href={`/pokedex/${gen.id}~34`}
                className="w-full flex-col gap-1 py-3"
              >
                <span>{gen.label}</span>
                <span className="font-body text-lg normal-case">
                  {gen.region} · #{gen.min}–{gen.max}
                </span>
              </GbLinkButton>
            </li>
          ))}
        </ul>
        <p className="mt-3 font-body text-base leading-snug">
          Pixel placeholder icons cover #1–898; newer Pokémon get a Poké Ball tile.
        </p>
      </GbScreen>
    </main>
  );
}
