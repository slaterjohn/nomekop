import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArtistEntity } from "@/lib/content/entities/registry";
import { getArtistCards } from "@/lib/tcg";
import { ArtistCardsSubpage } from "@/components/illustrator/artist-cards-subpage";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string; setId: string }> };

const setLabel = (name: string) => (name === "Base" ? "Base Set" : name);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token, setId } = await params;
  const artist = getArtistEntity(decodeURIComponent(token));
  if (!artist) return { title: "Illustrator" };
  const cards = (await getArtistCards(artist.slug)).filter((c) => c.setId === setId);
  if (cards.length === 0) return { title: artist.name };
  const setName = setLabel(cards[0]!.setName);
  const title = `${artist.name} cards in ${setName} (${cards.length})`;
  return {
    title,
    description: `Every ${setName} card illustrated by ${artist.name}.`,
    alternates: { canonical: `/illustrator/${artist.slug}/set/${setId}` },
  };
}

/** One illustrator's cards within a single set. */
export default async function ArtistSetPage({ params }: Props) {
  const { token, setId } = await params;
  const slug = decodeURIComponent(token);
  const artist = getArtistEntity(slug);
  if (!artist) notFound();
  const cards = (await getArtistCards(slug)).filter((c) => c.setId === setId);
  if (cards.length === 0) notFound();
  const setName = setLabel(cards[0]!.setName);
  return (
    <ArtistCardsSubpage
      artistName={artist.name}
      artistSlug={artist.slug}
      title={`${artist.name} in ${setName}`}
      subtitle={`${cards.length} ${setName} ${cards.length === 1 ? "card" : "cards"} by ${artist.name}.`}
      cards={cards}
    />
  );
}
