import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PokemonBinderView } from "@/components/pokemon/pokemon-binder-view";
import { BinderSkeleton } from "@/components/binder-skeleton";
import { BackButton } from "@/components/back-button";
import { GbDialogBox } from "@/components/gb/gb-dialog-box";
import {
  decodePokemonToken,
  displayNameFromSlug,
  type PokemonBinderOptions,
} from "@/lib/pokemon-binder";
import { searchPokemonCards } from "@/lib/tcg";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
};

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

/** The slow part — searches every set for this Pokémon. Isolated in its own
 *  async component so the page shell + skeleton stream instantly while it runs. */
async function PokemonBinderData({
  slug,
  displayName,
  options,
}: {
  slug: string;
  displayName: string;
  options: PokemonBinderOptions;
}) {
  const cards = await searchPokemonCards(slug, options.langs);

  if (cards.length === 0) {
    return (
      <GbDialogBox>
        WILD MISSINGNO. APPEARED! No cards found for that name. Check the spelling or try another
        Pokémon.
      </GbDialogBox>
    );
  }

  const langCount = new Set(cards.map((c) => c.lang ?? "en")).size;
  return (
    <>
      <p className="font-body text-xl leading-tight">
        Every {displayName} print across {new Set(cards.map((c) => c.setId)).size} sets —{" "}
        {cards.length} cards found{langCount > 1 ? ` in ${langCount} languages` : ""}.
      </p>
      <PokemonBinderView slug={slug} displayName={displayName} cards={cards} initialOptions={options} />
    </>
  );
}

/** A binder for one Pokémon across every set it has ever appeared in. */
export default async function PokemonBinderPage({ params }: Props) {
  const { token } = await params;
  const decoded = decodePokemonToken(decodeURIComponent(token));
  if (!decoded) notFound();
  const displayName = displayNameFromSlug(decoded.name);

  return (
    <main id="main" className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <BackButton fallbackHref="/pokemon" />
      </div>

      <h1 className="font-pixel text-lg leading-relaxed sm:text-xl">
        {displayName.toUpperCase()} BINDER
      </h1>

      <Suspense
        fallback={
          <BinderSkeleton
            what={`every ${displayName} print`}
            rows={decoded.options.rows}
            cols={decoded.options.cols}
          />
        }
      >
        <PokemonBinderData slug={decoded.name} displayName={displayName} options={decoded.options} />
      </Suspense>
    </main>
  );
}
