import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArtistEntity } from "@/lib/content/entities/registry";
import { getArtistCards } from "@/lib/tcg";
import { isIllustrationRare } from "@/lib/tcg/rarity";
import { ArtistCardsSubpage } from "@/components/illustrator/artist-cards-subpage";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const artist = getArtistEntity(decodeURIComponent(token));
  if (!artist) return { title: "Illustrator" };
  const title = `${artist.name} illustration cards — full art & Special Illustration Rares`;
  return {
    title,
    description: `Every Illustration Rare and Special Illustration Rare illustrated by ${artist.name}.`,
    alternates: { canonical: `/illustrator/${artist.slug}/illustrations` },
  };
}

/** An illustrator's full-art cards: Illustration Rares + Special Illustration Rares. */
export default async function ArtistIllustrationsPage({ params }: Props) {
  const { token } = await params;
  const slug = decodeURIComponent(token);
  const artist = getArtistEntity(slug);
  if (!artist) notFound();
  const cards = (await getArtistCards(slug)).filter((c) => isIllustrationRare(c.rarity));
  return (
    <ArtistCardsSubpage
      artistName={artist.name}
      artistSlug={artist.slug}
      title={`${artist.name} — illustration cards`}
      subtitle={`Illustration Rares and Special Illustration Rares by ${artist.name}.`}
      cards={cards}
    />
  );
}
