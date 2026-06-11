"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { GbBadge } from "@/components/gb/gb-badge";
import type { Slot } from "@/lib/layout";
import type { TcgSet } from "@/lib/tcg/types";

type CardSlotProps = {
  slot: Slot;
  set: Pick<TcgSet, "printedTotal">;
  /** When set, the pocket becomes a collected-state checkbox (tick mode). */
  tick?: {
    checked: boolean;
    onToggle: () => void;
  };
};

export function cardAlt(name: string, number: string, printedTotal: number, rarity?: string): string {
  return `${name} · ${number}/${printedTotal}${rarity ? ` · ${rarity}` : ""}`;
}

/** One binder pocket: card image (or fallback), number, REV badge, tick mark. */
export function CardSlot({ slot, set, tick }: CardSlotProps) {
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
  const isReverse = slot.kind === "reverse";

  const face = (
    <div
      className={cn(
        "relative aspect-[63/88] overflow-hidden border-2 border-gb-ink bg-gb-bg",
        isReverse && "shadow-[inset_0_0_0_3px_var(--gb-accent)]",
      )}
    >
      {card.imageSmall && !imageFailed ? (
        <Image
          src={card.imageSmall}
          alt={cardAlt(card.name, card.number, set.printedTotal, card.rarity)}
          fill
          sizes="160px"
          loading="lazy"
          unoptimized
          className="object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="flex h-full flex-col items-center justify-center gap-1 p-1 text-center">
          <span className="line-clamp-3 font-pixel text-[8px] leading-relaxed">{card.name}</span>
          <span className="font-body text-base">#{card.number}</span>
        </span>
      )}
      {isReverse ? (
        <GbBadge aria-label="Reverse holo pocket" className="absolute right-0.5 top-0.5">
          REV
        </GbBadge>
      ) : null}
      {tick?.checked ? (
        <span
          aria-hidden="true"
          data-gb-tick
          className="absolute left-0.5 top-0.5 inline-flex size-4 items-center justify-center rounded-full border-2 border-gb-ink bg-gb-accent"
        >
          <span className="block h-px w-2 bg-gb-ink" />
        </span>
      ) : null}
      <span
        aria-hidden="true"
        className={cn(
          "absolute bottom-0.5 left-0.5 bg-gb-bg/90 px-0.5 font-pixel text-[8px]",
          tick?.checked && "line-through",
        )}
      >
        {card.number}
      </span>
    </div>
  );

  if (tick) {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={tick.checked}
        aria-label={`Collected: ${cardAlt(card.name, card.number, set.printedTotal, card.rarity)}${isReverse ? " (reverse holo)" : ""}`}
        onClick={tick.onToggle}
        className="cursor-pointer text-left"
      >
        {face}
      </button>
    );
  }

  return face;
}
