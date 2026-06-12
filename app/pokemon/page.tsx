import type { Metadata } from "next";
import Link from "next/link";
import { GbScreen } from "@/components/gb/gb-screen";
import { GbLinkButton } from "@/components/gb/gb-button";
import { PokemonSearchForm } from "@/components/pokemon/pokemon-search-form";
import { encodePokemonToken, DEFAULT_POKEMON_OPTIONS } from "@/lib/pokemon-binder";

export const metadata: Metadata = {
  title: "Pokémon binders — every card of one Pokémon",
  description:
    "Pick a Pokémon and build a printable binder of every card it has ever appeared on — all prints, secrets only, or the rarest per set, newest or oldest first.",
  alternates: { canonical: "/pokemon" },
};

const POPULAR = [
  "Pikachu",
  "Charizard",
  "Eevee",
  "Mew",
  "Gengar",
  "Umbreon",
  "Rayquaza",
  "Lucario",
];

/** Landing page: search any Pokémon, or jump to a popular one. */
export default function PokemonLandingPage() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <nav className="flex flex-wrap items-center gap-3 font-pixel text-sm" aria-label="Breadcrumb">
        <Link href="/" className="no-underline">
          NOMEKOP
        </Link>
      </nav>
      <h1 className="font-pixel text-lg leading-relaxed sm:text-xl">POKÉMON BINDERS</h1>
      <p className="font-body text-xl leading-tight">
        One Pokémon, every card it has ever appeared on — across every set. Filter to secrets
        or the rarest print per set, order by release date, then print it.
      </p>

      <GbScreen title="CHOOSE YOUR POKÉMON">
        <div className="flex flex-col gap-4">
          <PokemonSearchForm />
          <p className="font-pixel text-[10px]">POPULAR</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR.map((name) => (
              <GbLinkButton
                key={name}
                variant="b"
                size="sm"
                href={`/pokemon/${encodePokemonToken(name, DEFAULT_POKEMON_OPTIONS)}`}
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
