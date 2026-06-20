import Image from "next/image";
import { GbBadge } from "@/components/gb/gb-badge";
import { cardAlt } from "@/lib/card-alt";
import { cn } from "@/lib/utils";
import type { SlotKind } from "@/lib/layout";
import type { PriceRange, TcgCard, TcgSet } from "@/lib/tcg/types";

const VARIANT_LABELS: Record<string, string> = {
  normal: "NORMAL",
  holofoil: "HOLO",
  reverseHolofoil: "REVERSE HOLO",
  "1stEditionNormal": "1ST EDITION",
  "1stEditionHolofoil": "1ST ED HOLO",
  unlimited: "UNLIMITED",
  unlimitedHolofoil: "UNLIMITED HOLO",
};

function money(value: number | undefined): string {
  return typeof value === "number" ? `$${value.toFixed(2)}` : "—";
}

function variantForKind(kind: SlotKind | null): string | null {
  switch (kind) {
    case "reverse":
      return "reverseHolofoil";
    // Ball patterns have no TCGplayer price keys (the API carries none).
    case "pokeball":
    case "masterball":
      return "__no_price_row__";
    default:
      return null;
  }
}

type CardDetailBodyProps = {
  card: TcgCard;
  set: TcgSet;
  /** Which pocket variant brought the viewer here (highlights its price row). */
  kind: SlotKind | null;
};

/** Card close-up: big scan, identity, prints and TCGplayer market prices.
 *  Server-compatible — used by /card/[cardId] and anywhere else. */
export function CardDetailBody({ card, set, kind }: CardDetailBodyProps) {
  const prices = card.tcgplayer?.prices;
  const clickedVariant = variantForKind(kind);

  return (
    <div className="flex flex-col gap-4 p-4 sm:flex-row">
      <div className="mx-auto w-48 shrink-0 sm:w-56">
        {card.imageLarge || card.imageSmall ? (
          <Image
            src={card.imageLarge || card.imageSmall}
            alt={cardAlt(card.name, card.number, set.printedTotal, card.rarity)}
            width={367}
            height={512}
            unoptimized
            className="h-auto w-full border-[3px] border-gb-ink"
          />
        ) : (
          <div className="flex aspect-[63/88] items-center justify-center border-[3px] border-dashed border-gb-muted p-2 text-center font-pixel text-[10px]">
            NO SCAN AVAILABLE
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p className="font-body text-xl">
          {set.name} · {set.series} · {set.releaseDate.slice(0, 4)}
        </p>

        <div className="flex flex-wrap gap-1.5" aria-label="Available prints">
          {card.variants.normal ? <GbBadge>Normal</GbBadge> : null}
          {card.variants.holo ? <GbBadge>Holo</GbBadge> : null}
          {card.variants.reverse ? <GbBadge>Reverse</GbBadge> : null}
          {card.variants.pokeball ? <GbBadge>Poké Ball</GbBadge> : null}
          {card.variants.masterball ? <GbBadge>Master Ball</GbBadge> : null}
        </div>

        {prices ? (
          <div>
            <table aria-label="TCGplayer prices" className="w-full border-[3px] border-gb-ink">
              <thead>
                <tr className="bg-gb-accent font-pixel text-[9px] uppercase">
                  <th scope="col" className="px-2 py-1.5 text-left">
                    Print
                  </th>
                  <th scope="col" className="px-2 py-1.5 text-right">
                    Market
                  </th>
                  <th scope="col" className="px-2 py-1.5 text-right">
                    Low
                  </th>
                  <th scope="col" className="px-2 py-1.5 text-right">
                    Mid
                  </th>
                </tr>
              </thead>
              <tbody className="font-body text-lg">
                {Object.entries(prices).map(([variant, range]: [string, PriceRange]) => {
                  const mine =
                    variant === (clickedVariant ?? "normal") ||
                    (clickedVariant === null && variant === "holofoil" && !prices.normal);
                  return (
                    <tr key={variant} className={cn("border-t-2 border-gb-ink/30", mine && "bg-gb-accent/60")}>
                      <td className="px-2 py-1.5">
                        {VARIANT_LABELS[variant] ?? variant.toUpperCase()}
                        {mine ? <span className="ml-1.5 font-pixel text-[8px]">◀ THIS POCKET</span> : null}
                      </td>
                      <td className="px-2 py-1.5 text-right font-bold tabular-nums">{money(range.market)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{money(range.low)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{money(range.mid)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-1.5 font-body text-base">
              TCGplayer prices · updated {card.tcgplayer?.updatedAt ?? "recently"}
              {card.tcgplayer?.url ? (
                <>
                  {" · "}
                  <a
                    href={card.tcgplayer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    VIEW ON TCGPLAYER ↗
                  </a>
                </>
              ) : null}
            </p>
          </div>
        ) : (
          <div className="border-[3px] border-dashed border-gb-muted p-3 font-pixel text-[10px] leading-relaxed">
            NO PRICE DATA YET — TCGPLAYER HASN&apos;T LISTED THIS PRINT.
          </div>
        )}
      </div>
    </div>
  );
}
