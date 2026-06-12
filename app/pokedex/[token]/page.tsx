import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PokedexView } from "@/components/pokedex/pokedex-view";
import { BinderSkeleton } from "@/components/binder-skeleton";
import { BackButton } from "@/components/back-button";
import { decodePokedexToken, generationById, type PokedexConfig } from "@/lib/pokedex";
import { getPokedexCards } from "@/lib/tcg";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const config = decodePokedexToken(decodeURIComponent(token));
  if (!config) return { title: "Pokédex binder" };
  const gen = generationById(config.gen)!;
  return {
    title: `${gen.region} Pokédex binder (#${gen.min}–${gen.max})`,
    description: `A printable ${gen.region} Pokédex binder: one pocket per Pokémon in National Dex order, secret and rarest cards by default, fully swappable.`,
    alternates: { canonical: `/pokedex/${config.gen}~34` },
    // Custom-pick permutations are infinite; canonicalising to the default
    // token keeps the index clean while every share link still resolves.
  };
}

/** The slow part — fetches every card for the generation's dex range. Isolated
 *  so the page shell + skeleton stream instantly while it runs. */
async function PokedexData({ config }: { config: PokedexConfig }) {
  const cards = await getPokedexCards(config.gen);
  return <PokedexView initialConfig={config} cards={cards} />;
}

/** The Pokédex binder for one generation, with the user's swaps applied. */
export default async function PokedexPage({ params }: Props) {
  const { token } = await params;
  const config = decodePokedexToken(decodeURIComponent(token));
  if (!config) notFound();
  const gen = generationById(config.gen)!;

  return (
    <main id="main" className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <BackButton fallbackHref="/pokedex" />
      </div>

      <h1 className="font-pixel text-lg leading-relaxed sm:text-xl">
        {gen.region.toUpperCase()} POKÉDEX · #{gen.min}–{gen.max}
      </h1>

      <Suspense
        fallback={
          <BinderSkeleton what={`the ${gen.region} Pokédex`} rows={config.rows} cols={config.cols} />
        }
      >
        <PokedexData config={config} />
      </Suspense>
    </main>
  );
}
