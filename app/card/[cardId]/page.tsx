import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardDetailBody } from "@/components/builder/card-detail-body";
import { BackButton } from "@/components/back-button";
import { GbScreen } from "@/components/gb/gb-screen";
import { GbLinkButton } from "@/components/gb/gb-button";
import { getCards, getSets } from "@/lib/tcg";
import { TcgError } from "@/lib/tcg/types";
import type { SlotKind } from "@/lib/layout";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ cardId: string }>;
  searchParams: Promise<{ variant?: string }>;
};

/** pokemontcg ids are `<setId>-<number>`; set ids never contain dashes. */
function parseCardId(cardId: string): { setId: string; number: string } | null {
  const dash = cardId.lastIndexOf("-");
  if (dash <= 0 || dash === cardId.length - 1) return null;
  return { setId: cardId.slice(0, dash), number: cardId.slice(dash + 1) };
}

async function loadCard(cardId: string) {
  const parsed = parseCardId(cardId);
  if (!parsed) notFound();
  try {
    const [sets, cards] = await Promise.all([getSets(), getCards(parsed.setId)]);
    const set = sets.find((s) => s.id === parsed.setId);
    const card = cards.find((c) => c.id === cardId);
    if (!set || !card) notFound();
    return { set, card };
  } catch (err) {
    if (err instanceof TcgError && err.kind === "unknown-set") notFound();
    throw err;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cardId } = await params;
  const parsed = parseCardId(cardId);
  return { title: parsed ? `${cardId} — Bindermon` : "Card — Bindermon" };
}

const KINDS: SlotKind[] = ["card", "reverse", "pokeball", "masterball"];

export default async function CardPage({ params, searchParams }: Props) {
  const [{ cardId }, { variant }] = await Promise.all([params, searchParams]);
  const { set, card } = await loadCard(cardId);
  const kind: SlotKind = KINDS.includes(variant as SlotKind) ? (variant as SlotKind) : "card";

  return (
    <main id="main" className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="font-pixel text-sm no-underline">
          BINDERMON
        </Link>
        <BackButton fallbackHref={`/?set=${set.id}`} />
      </div>
      <GbScreen title={`${card.name} · ${card.number}/${set.printedTotal}${card.rarity ? ` · ${card.rarity.toUpperCase()}` : ""}`}>
        <CardDetailBody card={card} set={set} kind={kind} />
        <div className="px-4 pb-4">
          <GbLinkButton variant="a" size="sm" href={`/?set=${set.id}`}>
            OPEN {set.name.toUpperCase()} IN THE BUILDER
          </GbLinkButton>
        </div>
      </GbScreen>
    </main>
  );
}
