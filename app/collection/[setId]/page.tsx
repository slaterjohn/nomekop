import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionView } from "@/components/collection/collection-view";
import { getCards, getSets } from "@/lib/tcg";
import { TcgError } from "@/lib/tcg/types";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ mode?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { setId } = await params;
  return {
    title: `Collection: ${setId}`,
    // Collections live in this browser's localStorage — never index them, but
    // let crawlers follow the links back out to the public set/card pages.
    robots: { index: false, follow: true },
  };
}

/** Your collected cards for one set — local to this browser (no accounts). */
export default async function CollectionPage({ params, searchParams }: Props) {
  const [{ setId }, { mode }] = await Promise.all([params, searchParams]);
  if (!/^[a-z0-9.]+$/i.test(setId)) notFound();
  let sets, cards;
  try {
    [sets, cards] = await Promise.all([getSets(), getCards(setId)]);
  } catch (err) {
    if (err instanceof TcgError && err.kind === "unknown-set") notFound();
    throw err;
  }
  const set = sets.find((s) => s.id === setId);
  if (!set || cards.length === 0) notFound();
  return <CollectionView set={set} cards={cards} mode={mode === "master" ? "master" : "standard"} />;
}
