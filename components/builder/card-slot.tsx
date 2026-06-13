"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { GbBadge } from "@/components/gb/gb-badge";
import { PixelPokeball } from "@/components/gb/pixel-pokeball";
import { cardAlt } from "@/lib/card-alt";
import { slotBadge, slotKindSuffix } from "@/lib/variant-labels";
import { languageByCode } from "@/lib/tcg/languages";
import type { Slot } from "@/lib/layout";
import type { TcgSet } from "@/lib/tcg/types";

type CardSlotProps = {
  slot: Slot;
  set: Pick<TcgSet, "printedTotal">;
  /** When set, the pocket becomes a collected-state checkbox (collection mode). */
  tick?: {
    checked: boolean;
    onToggle: (element: HTMLElement) => void;
  };
  /** Normal-mode click-through to the card detail view (collection mode wins). */
  onInspect?: () => void;
};

/** One binder pocket: scan, number, variant badges, foil shimmer, collected mark. */
export function CardSlot({ slot, set, tick, onInspect }: CardSlotProps) {
  const [imageFailed, setImageFailed] = useState(false);

  if (slot.kind === "empty") {
    return (
      <div
        aria-hidden="true"
        data-gb-empty="true"
        className="aspect-[63/88] border-2 border-dashed border-gb-muted"
      />
    );
  }

  const { card } = slot;
  const badge = slotBadge(slot.kind);
  const isHoloPrint = slot.kind === "card" && card.variants.holo;
  const isFoil = isHoloPrint || slot.kind !== "card";
  const collected = tick?.checked ?? false;
  const langLabel =
    card.lang && card.lang !== "en" ? ` — ${languageByCode(card.lang)?.label ?? card.lang}` : "";

  const face = (
    <div
      className={cn(
        "relative aspect-[63/88] overflow-hidden border-2 border-gb-ink bg-gb-bg",
        slot.kind !== "card" && "shadow-[inset_0_0_0_3px_var(--gb-accent)]",
      )}
    >
      {card.imageSmall && !imageFailed ? (
        <Image
          src={card.imageSmall}
          alt={cardAlt(card.name, card.number, set.printedTotal, card.rarity)}
          // Explicit intrinsic size (small scans are 245×342) so the image
          // can never collapse to 0×0 when a parent fails to size it.
          width={245}
          height={342}
          loading="lazy"
          unoptimized
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            collected && "opacity-40 saturate-[0.35]",
          )}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="flex h-full flex-col items-center justify-center gap-1 p-1 text-center">
          <span className="line-clamp-3 font-pixel text-[8px] leading-relaxed">{card.name}</span>
          <span className="font-body text-base">#{card.number}</span>
        </span>
      )}
      {isFoil ? (
        <span aria-hidden="true" data-gb-shimmer className="gb-shimmer pointer-events-none absolute inset-0" />
      ) : null}
      {badge ? (
        <GbBadge aria-label={`${slotKindSuffix(slot.kind).replace(/[()]/g, "").trim()} pocket`} className="absolute right-0.5 top-0.5">
          {badge}
        </GbBadge>
      ) : null}
      {isHoloPrint ? (
        <GbBadge aria-label="Holo print" className="absolute right-0.5 top-0.5 bg-gb-accent text-gb-ink">
          HOLO
        </GbBadge>
      ) : null}
      {collected ? (
        <span
          aria-hidden="true"
          data-gb-tick
          className="absolute left-1 top-1 inline-flex items-center justify-center bg-gb-bg/85 p-0.5 shadow-[2px_2px_0_0_var(--gb-ink)]"
        >
          <PixelPokeball size={22} />
        </span>
      ) : null}
      <span
        aria-hidden="true"
        className={cn(
          "absolute bottom-0.5 left-0.5 bg-gb-bg/90 px-0.5 font-pixel text-[8px]",
          collected && "line-through",
        )}
      >
        {card.number}
      </span>
      {card.lang && card.lang !== "en" ? (
        <span
          aria-hidden="true"
          className="absolute right-0.5 bottom-0.5 bg-gb-ink px-1 font-pixel text-[8px] text-gb-bg"
        >
          {card.lang.slice(0, 2).toUpperCase()}
        </span>
      ) : null}
    </div>
  );

  if (tick) {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={tick.checked}
        aria-label={`Collected: ${cardAlt(card.name, card.number, set.printedTotal, card.rarity)}${slotKindSuffix(slot.kind)}${langLabel}`}
        onClick={(e) => tick.onToggle(e.currentTarget)}
        // block w-full: a shrink-to-fit button collapses the aspect-ratio
        // face to ~4px (regression: invisible, unclickable tick targets).
        className="block w-full cursor-pointer text-left"
      >
        {face}
      </button>
    );
  }

  if (onInspect) {
    return (
      <button
        type="button"
        aria-label={`View details: ${cardAlt(card.name, card.number, set.printedTotal, card.rarity)}${slotKindSuffix(slot.kind)}${langLabel}`}
        onClick={onInspect}
        className="block w-full cursor-pointer text-left motion-safe:transition-transform motion-safe:hover:-translate-y-0.5"
      >
        {face}
      </button>
    );
  }

  return face;
}
