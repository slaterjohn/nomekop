import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardDetailBody } from "@/components/builder/card-detail-body";
import { BackButton } from "@/components/back-button";
import { GbScreen } from "@/components/gb/gb-screen";
import { GbLinkButton } from "@/components/gb/gb-button";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, cardProductJsonLd } from "@/lib/structured-data";
import { getCards, getSets } from "@/lib/tcg";
import { DEFAULT_POKEMON_OPTIONS, encodePokemonToken } from "@/lib/pokemon-binder";
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

/** Shared by generateMetadata and the page body — cache() dedupes the fetch
 *  so both run off a single sets+cards lookup per request. */
const loadCard = cache(async (cardId: string) => {
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
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cardId } = await params;
  const { set, card } = await loadCard(cardId);

  const prices = card.tcgplayer?.prices;
  const market =
    prices?.normal?.market ?? prices?.holofoil?.market ?? prices?.reverseHolofoil?.market;
  const price = typeof market === "number" ? `$${market.toFixed(2)}` : null;

  const baseTitle = `${card.name} ${card.number}/${set.printedTotal} · ${set.name}`;
  // The layout template appends " — Nomekop"; skip the tagline for long names.
  const title = baseTitle.length > 40 ? baseTitle : `${baseTitle} — price & binder placement`;
  const description =
    `${card.name} ${card.number}/${set.printedTotal} from the ${set.name} set` +
    (card.rarity ? ` (${card.rarity})` : "") +
    (price ? ` — ${price} market on TCGplayer` : "") +
    ". See variants, current prices and this card's pocket in a printable binder layout.";

  return {
    title,
    description,
    alternates: { canonical: `/card/${cardId}` },
    // No images here on purpose: app/card/[cardId]/opengraph-image.tsx (file
    // convention) supplies og:image and twitter:image for this route.
    openGraph: { title, description, type: "website", url: `/card/${cardId}` },
    twitter: { card: "summary_large_image" },
  };
}

const KINDS: SlotKind[] = ["card", "reverse", "pokeball", "masterball"];

export default async function CardPage({ params, searchParams }: Props) {
  const [{ cardId }, { variant }] = await Promise.all([params, searchParams]);
  const { set, card } = await loadCard(cardId);
  const kind: SlotKind = KINDS.includes(variant as SlotKind) ? (variant as SlotKind) : "card";

  return (
    <main id="main" className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6">
      <JsonLd
        data={[
          cardProductJsonLd(card, set),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Sets", path: "/sets" },
            { name: set.name, path: `/set/${set.id}` },
            { name: `${card.name} ${card.number}`, path: `/card/${card.id}` },
          ]),
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/" className="font-pixel text-sm no-underline">
            NOMEKOP
          </Link>
          <Link href={`/set/${set.id}`} className="font-pixel text-sm no-underline">
            {set.name.toUpperCase()} <span aria-hidden="true">▶</span>
          </Link>
        </div>
        <BackButton fallbackHref={`/?set=${set.id}`} />
      </div>
      <GbScreen title={`${card.name} · ${card.number}/${set.printedTotal}${card.rarity ? ` · ${card.rarity.toUpperCase()}` : ""}`}>
        <CardDetailBody card={card} set={set} kind={kind} />
        <div className="flex flex-wrap gap-2 px-4 pb-4">
          <GbLinkButton variant="a" size="sm" href={`/?set=${set.id}`}>
            OPEN {set.name.toUpperCase()} IN THE BUILDER
          </GbLinkButton>
          {card.supertype === "Pokémon" ? (
            <GbLinkButton
              variant="b"
              size="sm"
              href={`/pokemon/${encodePokemonToken(card.name, DEFAULT_POKEMON_OPTIONS)}`}
            >
              ALL {card.name.toUpperCase()} CARDS ▶
            </GbLinkButton>
          ) : null}
        </div>
      </GbScreen>
    </main>
  );
}
