"use client";

import { GbButton } from "@/components/gb/gb-button";
import { CardSlot } from "@/components/builder/card-slot";
import { flyToCollectionBar } from "@/lib/fly-to";
import { useRememberedSpread } from "@/lib/use-remembered-spread";
import { play } from "@/lib/sound";
import type { BinderLayout, Page, SlotKind } from "@/lib/layout";
import type { TcgCard, TcgSet } from "@/lib/tcg/types";

type TickApi = {
  isChecked: (slotKey: string) => boolean;
  toggle: (slotKey: string) => void;
};

type BinderPreviewProps = {
  set: TcgSet;
  layout: BinderLayout;
  /** Optional checklist tick mode (slot keys = cardId:kind). */
  tick?: TickApi;
  /** Opens the card detail view for a clicked pocket (collection mode wins). */
  onInspect?: (card: TcgCard, kind: SlotKind) => void;
  /** Persist the current spread under this key so Back restores the page. */
  rememberKey?: string;
};

export function slotKey(cardId: string, kind: SlotKind): string {
  return `${cardId}:${kind}`;
}

/**
 * The open binder: one spread at a time (page 1 alone, then facing pairs),
 * d-pad/buttons to flip, a live announcement of the position, and a deal-in
 * animation that respects reduced motion via global CSS.
 */
export function BinderPreview({ set, layout, tick, onInspect, rememberKey }: BinderPreviewProps) {
  const [spreadIndex, setSpreadIndex] = useRememberedSpread(rememberKey);
  const spreads = layout.spreads;
  const clamped = Math.min(spreadIndex, Math.max(0, spreads.length - 1));
  const spread = spreads[clamped];

  if (!spread) {
    return (
      <p className="py-6 text-center font-pixel text-xs">NO CARDS TO SHOW — PICK ANOTHER SET</p>
    );
  }

  const go = (next: number) => {
    const clampedNext = Math.max(0, Math.min(spreads.length - 1, next));
    if (clampedNext !== clamped) play("move");
    setSpreadIndex(clampedNext);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        go(clamped + 1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        go(clamped - 1);
        break;
      case "Home":
        e.preventDefault();
        go(0);
        break;
      case "End":
        e.preventDefault();
        go(spreads.length - 1);
        break;
    }
  };

  const label =
    spread.left && spread.right
      ? `PAGES ${spread.left.number}–${spread.right.number} OF ${layout.stats.pages}`
      : `PAGE ${(spread.left ?? spread.right)!.number} OF ${layout.stats.pages}`;

  return (
    // The group is focusable so binder pages flip with the d-pad (arrow keys);
    // the buttons below offer the same controls to every input method.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions
    <div role="group" aria-label="Binder pages" tabIndex={0} onKeyDown={onKeyDown} className="outline-offset-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <GbButton
          variant="b"
          size="sm"
          aria-label="Previous pages"
          disabled={clamped === 0}
          onClick={() => go(clamped - 1)}
        >
          ◀
        </GbButton>
        <p aria-live="polite" className="font-pixel text-[10px] sm:text-xs">
          {label}
        </p>
        <GbButton
          variant="b"
          size="sm"
          aria-label="Next pages"
          disabled={clamped === spreads.length - 1}
          onClick={() => go(clamped + 1)}
        >
          ▶
        </GbButton>
      </div>

      <div key={clamped} data-gb-spread className="flex flex-col gap-4 motion-safe:animate-gb-flip-in sm:flex-row">
        {spread.left ? (
          <PageGrid page={spread.left} layout={layout} set={set} tick={tick} onInspect={onInspect} />
        ) : (
          <div aria-hidden="true" className="hidden flex-1 sm:block" />
        )}
        {spread.right ? (
          <PageGrid page={spread.right} layout={layout} set={set} tick={tick} onInspect={onInspect} />
        ) : (
          <div aria-hidden="true" className="hidden flex-1 sm:block" />
        )}
      </div>
    </div>
  );
}

function PageGrid({
  page,
  layout,
  set,
  tick,
  onInspect,
}: {
  page: Page;
  layout: BinderLayout;
  set: TcgSet;
  tick?: TickApi;
  onInspect?: (card: TcgCard, kind: SlotKind) => void;
}) {
  return (
    <section aria-label={`Page ${page.number}`} className="flex-1">
      <h3 className="mb-1 text-center font-pixel text-[10px]">PAGE {page.number}</h3>
      <div
        className="grid gap-1.5 border-[3px] border-gb-ink bg-gb-accent/30 p-1.5"
        style={{ gridTemplateColumns: `repeat(${layout.stats.cols}, minmax(0, 1fr))` }}
      >
        {page.slots.map((slot, i) => {
          const key = slot.kind === "empty" ? `empty-${i}` : `${slot.card.id}-${slot.kind}`;
          const tickApi =
            tick && slot.kind !== "empty"
              ? (() => {
                  const key = slotKey(slot.card.id, slot.kind);
                  const checked = tick.isChecked(key);
                  return {
                    checked,
                    onToggle: (element: HTMLElement) => {
                      if (!checked) flyToCollectionBar(element);
                      play(checked ? "back" : "move");
                      tick.toggle(key);
                    },
                  };
                })()
              : undefined;
          const inspect =
            !tick && onInspect && slot.kind !== "empty"
              ? () => onInspect(slot.card, slot.kind)
              : undefined;
          return (
            <div key={key} className="motion-safe:animate-gb-deal" style={{ animationDelay: `${i * 22}ms` }}>
              <CardSlot slot={slot} set={set} tick={tickApi} onInspect={inspect} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
