import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PokemonBinderView } from "@/components/pokemon/pokemon-binder-view";
import { BackButton } from "@/components/back-button";
import { GbDialogBox } from "@/components/gb/gb-dialog-box";
import { decodePokemonToken, displayNameFromSlug } from "@/lib/pokemon-binder";
import { searchPokemonCards } from "@/lib/tcg";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
};

const loadPokemon = cache(async (token: string) => {
  const decoded = decodePokemonToken(decodeURIComponent(token));
  if (!decoded) notFound();
  const cards = await searchPokemonCards(decoded.name);
  return { ...decoded, cards };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const decoded = decodePokemonToken(decodeURIComponent(token));
  if (!decoded) return { title: "Pokémon binder" };
  const name = displayNameFromSlug(decoded.name);
  return {
    title: `${name} binder — every card in one layout`,
    description: `Build a printable binder of every ${name} card across all Pokemon TCG sets: secrets only or rarest per set, newest or oldest first, A4 pages and placeholders.`,
    alternates: { canonical: `/pokemon/${encodeURIComponent(token)}` },
  };
}

/** A binder for one Pokémon across every set it has ever appeared in. */
export default async function PokemonBinderPage({ params }: Props) {
  const { token } = await params;
  const { name, options, cards } = await loadPokemon(token);
  const displayName = displayNameFromSlug(name);

  return (
    <main id="main" className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 font-pixel text-sm">
          <Link href="/" className="no-underline">
            NOMEKOP
          </Link>
          <span aria-hidden="true">▶</span>
          <Link href="/pokemon" className="no-underline">
            POKÉMON BINDERS
          </Link>
        </div>
        <BackButton fallbackHref="/pokemon" />
      </div>

      <h1 className="font-pixel text-lg leading-relaxed sm:text-xl">
        {displayName.toUpperCase()} BINDER
      </h1>
      <p className="font-body text-xl leading-tight">
        Every {displayName} print across {new Set(cards.map((c) => c.setId)).size} sets —{" "}
        {cards.length} cards found.
      </p>

      {cards.length === 0 ? (
        <GbDialogBox>
          WILD MISSINGNO. APPEARED! No cards found for that name. Check the spelling or try
          another Pokémon.
        </GbDialogBox>
      ) : (
        <PokemonBinderView slug={name} displayName={displayName} cards={cards} initialOptions={options} />
      )}
    </main>
  );
}
