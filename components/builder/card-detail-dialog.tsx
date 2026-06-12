"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GbBadge } from "@/components/gb/gb-badge";
import { cardAlt } from "@/lib/card-alt";
import { cn } from "@/lib/utils";
import type { PriceRange, TcgCard, TcgSet } from "@/lib/tcg/types";

type PocketKind = "card" | "reverse";

type CardDetailDialogProps = {
  card: TcgCard | null;
  /** Which pocket was clicked — highlights the matching price variant. */
  kind: PocketKind | null;
  set: TcgSet;
  onClose: () => void;
};

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

function variantForKind(kind: PocketKind | null): string | null {
  return kind === "reverse" ? "reverseHolofoil" : null;
}

/** Card close-up: big scan, identity, variants and TCGplayer market prices. */
export function CardDetailDialog({ card, kind, set, onClose }: CardDetailDialogProps) {
  if (!card) return null;

  const prices = card.tcgplayer?.prices;
  const clickedVariant = variantForKind(kind);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto rounded-none border-4 border-gb-ink bg-gb-bg p-0 shadow-[6px_6px_0_0_var(--gb-ink)] sm:max-w-2xl">
        <DialogHeader className="border-b-4 border-gb-ink bg-gb-ink px-4 py-3 text-left">
          <DialogTitle className="font-pixel text-sm uppercase leading-relaxed text-gb-bg">
            {card.name}
          </DialogTitle>
          <DialogDescription className="font-body text-lg text-gb-bg">
            {card.number}/{set.printedTotal}
            {card.rarity ? ` · ${card.rarity}` : ""} · {card.supertype}
          </DialogDescription>
        </DialogHeader>

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
              {card.variants.normal ? <GbBadge>NORMAL</GbBadge> : null}
              {card.variants.holo ? <GbBadge>HOLO</GbBadge> : null}
              {card.variants.reverse ? <GbBadge>REVERSE</GbBadge> : null}
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
                      <th scope="col" className="px-2 py-1.5 text-right">
                        High
                      </th>
                    </tr>
                  </thead>
                  <tbody className="font-body text-lg">
                    {Object.entries(prices).map(([variant, range]: [string, PriceRange]) => {
                      const mine = variant === (clickedVariant ?? "normal") || (clickedVariant === null && variant === "holofoil" && !prices.normal);
                      return (
                        <tr
                          key={variant}
                          className={cn("border-t-2 border-gb-ink/30", mine && "bg-gb-accent/60")}
                        >
                          <td className="px-2 py-1.5">
                            {VARIANT_LABELS[variant] ?? variant.toUpperCase()}
                            {mine ? (
                              <span className="ml-1.5 font-pixel text-[8px]">◀ THIS POCKET</span>
                            ) : null}
                          </td>
                          <td className="px-2 py-1.5 text-right font-bold tabular-nums">
                            {money(range.market)}
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{money(range.low)}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{money(range.mid)}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{money(range.high)}</td>
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
      </DialogContent>
    </Dialog>
  );
}
