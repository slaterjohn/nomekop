import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CardDetailBody } from "@/components/builder/card-detail-body";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { GbScreen } from "@/components/gb/gb-screen";
import { GbLinkButton } from "@/components/gb/gb-button";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, cardProductJsonLd } from "@/lib/structured-data";
import { getCards, getSets } from "@/lib/tcg";
import { DEFAULT_POKEMON_OPTIONS, encodePokemonToken } from "@/lib/pokemon-binder";
import { DEFAULT_CONFIG } from "@/lib/config";
import { encodeShareToken } from "@/lib/share";
import { DEFAULT_ILLUSTRATOR_OPTIONS, encodeIllustratorToken } from "@/lib/illustrator-binder";
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

  // Only priced cards get a Product node — an offerless Product is a Search
  // Console "Product snippets" critical error. Unpriced cards keep just the
  // breadcrumb (cardProductJsonLd returns null when there's no market data).
  const productLd = cardProductJsonLd(card, set);
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "NOMEKOP", path: "/" },
    { name: "SETS", path: "/sets" },
    { name: set.name, path: `/set/${set.id}` },
    { name: `${card.name} ${card.number}`, path: `/card/${card.id}` },
  ]);

  return (
    <main id="main" className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6">
      <JsonLd data={productLd ? [productLd, breadcrumbLd] : breadcrumbLd} />
      {/* The visible card identity is GbScreen's <h2>; this sr-only <h1> gives the
          page its primary topical heading (card pages had none). */}
      <h1 className="sr-only">
        {card.name} {card.number}/{set.printedTotal} · {set.name}
      </h1>
      <Breadcrumbs
        parents={[
          { url: "/sets", label: "All sets" },
          { url: `/set/${set.id}`, label: set.name === "Base" ? "Base Set" : set.name },
        ]}
        label={`${card.name} ${card.number}/${set.printedTotal}`}
      />
      <GbScreen title={`${card.name} · ${card.number}/${set.printedTotal}${card.rarity ? ` · ${card.rarity.toUpperCase()}` : ""}`}>
        <CardDetailBody card={card} set={set} kind={kind} />
        <div className="flex flex-wrap gap-2 px-4 pb-4">
          <GbLinkButton
            variant="a"
            size="sm"
            href={`/b/${encodeShareToken({ ...DEFAULT_CONFIG, set: set.id })}`}
          >
            Open {set.name} in the builder
          </GbLinkButton>
          {card.supertype === "Pokémon" ? (
            <GbLinkButton
              variant="b"
              size="sm"
              href={`/pokemon/${encodePokemonToken(card.name, DEFAULT_POKEMON_OPTIONS)}`}
            >
              All {card.name} cards ▶
            </GbLinkButton>
          ) : null}
          {card.artist ? (
            <GbLinkButton
              variant="b"
              size="sm"
              href={`/illustrator/${encodeIllustratorToken(card.artist, DEFAULT_ILLUSTRATOR_OPTIONS)}`}
            >
              More by {card.artist} ▶
            </GbLinkButton>
          ) : null}
        </div>
      </GbScreen>
    </main>
  );
}
