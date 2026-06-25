import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArtistEntity } from "@/lib/content/entities/registry";
import { getPokemonCatalogEntry } from "@/lib/content/entities/catalog";
import { getArtistCards } from "@/lib/tcg";
import { ArtistCardsSubpage } from "@/components/illustrator/artist-cards-subpage";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token, slug } = await params;
  const artist = getArtistEntity(decodeURIComponent(token));
  const pokemon = getPokemonCatalogEntry(decodeURIComponent(slug));
  if (!artist || !pokemon) return { title: "Illustrator" };
  const title = `${pokemon.name} cards illustrated by ${artist.name}`;
  return {
    title,
    description: `Every ${pokemon.name} card illustrated by ${artist.name}.`,
    alternates: { canonical: `/illustrator/${artist.slug}/pokemon/${pokemon.slug}` },
  };
}

/** One illustrator's cards of a single Pokémon species (matched by dex). */
export default async function ArtistPokemonPage({ params }: Props) {
  const { token, slug } = await params;
  const artistSlug = decodeURIComponent(token);
  const artist = getArtistEntity(artistSlug);
  const pokemon = getPokemonCatalogEntry(decodeURIComponent(slug));
  if (!artist || !pokemon) notFound();
  const cards = (await getArtistCards(artistSlug)).filter((c) => c.dex?.includes(pokemon.dex));
  if (cards.length === 0) notFound();
  return (
    <ArtistCardsSubpage
      artistName={artist.name}
      artistSlug={artist.slug}
      title={`${pokemon.name} by ${artist.name}`}
      subtitle={`${cards.length} ${pokemon.name} ${cards.length === 1 ? "card" : "cards"} illustrated by ${artist.name}.`}
      cards={cards}
    />
  );
}
